import assert from "node:assert/strict";
import test from "node:test";
import { parseOpportunityDraft } from "../src/input.ts";
import { assessRisk, containsPotentialSecret, redactSecrets } from "../src/risk.ts";
import { feedbackDecisions } from "../src/analytics.ts";
import { scoreOpportunity } from "../src/scoring.ts";
import { canTransition } from "../src/state-machine.ts";
import { emptyState } from "../src/store.ts";
import type { Asset, Opportunity } from "../src/types.ts";

const highSignals = {
  userImpact: 90, freshness: 90, compounding: 90,
  ecosystemValue: 90, evidenceConfidence: 90, executability: 90,
};

test("scoring is deterministic and applies the DSH eligibility gate", () => {
  assert.deepEqual(scoreOpportunity(highSignals, true), scoreOpportunity(highSignals, true));
  assert.equal(scoreOpportunity(highSignals, true).score, 90);
  assert.equal(scoreOpportunity(highSignals, true).lane, "DUAL_TRACK");
  assert.equal(scoreOpportunity(highSignals, false).lane, "INELIGIBLE");
  assert.equal(scoreOpportunity({ ...highSignals, duplicatePenalty: 30 }, true).score, 60);
});

test("opportunity input rejects unknown fields and invalid score ranges", () => {
  const base = {
    title: "test", summary: "test", sourceType: "official", directDshAction: true,
    audience: ["user"], proposedAssets: ["faq"], signals: highSignals,
  };
  assert.throws(() => parseOpportunityDraft({ ...base, surprise: true }), /unknown fields/);
  assert.throws(() => parseOpportunityDraft({ ...base, signals: { ...highSignals, userImpact: 101 } }), /between 0 and 100/);
  assert.throws(
    () => parseOpportunityDraft({ ...base, sourceUrl: "https://example.com/change?access_token=secret-value" }),
    /sensitive query/,
  );
});

test("state machine rejects cross-aggregate style shortcuts", () => {
  assert.equal(canTransition("TRIAGED", "CLAIMED"), true);
  assert.equal(canTransition("TRIAGED", "RELEASED"), false);
  assert.equal(canTransition("READY", "RELEASED"), true);
});

test("risk gate blocks destructive actions and redacts credentials", () => {
  assert.equal(assessRisk("delete").requiresUser, true);
  assert.equal(assessRisk("publish", "ordinary text").requiresUser, false);
  const leaked = "api_key=super-secret-value";
  assert.equal(assessRisk("publish", leaked).requiresUser, true);
  assert.equal(redactSecrets(leaked).includes("super-secret-value"), false);
});

test("secret detection covers common environment, cloud, JWT, private-key and privacy formats", () => {
  const awsExample = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
  const slackExample = ["xoxb", "123456789012", "abcdefghijklmnop"].join("-");
  const privateKeyExample = ["-----BEGIN OPENSSH", " PRIVATE KEY-----"].join("");
  for (const sample of [
    "DEEPSEEK_API_KEY=super-secret-value-123",
    awsExample,
    slackExample,
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghi123456789",
    privateKeyExample,
    "password=hunter2-do-not-store",
    "联系手机 13800138000",
    "身份证 11010519491231002X",
  ]) {
    assert.equal(containsPotentialSecret(sample), true, sample);
  }
});

test("feedback favors durable usage and never lets reach alone dominate", () => {
  const state = emptyState("2026-08-13T00:00:00.000Z");
  const opportunity = {
    id: "opp_feedback", fingerprint: "feedback", title: "feedback", summary: "feedback",
    sourceType: "feedback", observedAt: "2026-08-13T00:00:00.000Z", directDshAction: true,
    audience: ["user"], proposedAssets: ["faq"], signals: highSignals,
    score: 90, lane: "DUAL_TRACK", status: "READY", risk: "LOW",
    evidenceIds: [], assetIds: ["ast_feedback"], failureCount: 0, revision: 1,
    createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
  } satisfies Opportunity;
  const asset = {
    id: "ast_feedback", opportunityId: opportunity.id, type: "faq", title: "FAQ",
    canonicalPath: "content/faq.md", revision: 1, contentHash: "hash", evidenceIds: [],
    sourceRefs: [], verification: "PASS", status: "READY", channelJobIds: [],
    createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
  } satisfies Asset;
  state.opportunities.push(opportunity);
  state.assets.push(asset);
  state.metrics.push({
    id: "met_reach", assetId: asset.id, channel: "weibo", capturedAt: "2026-08-13T01:00:00.000Z",
    values: { views: 10_000 },
  });
  const reachOnly = feedbackDecisions(state)[0];
  assert.equal(reachOnly.adjustment < 0, true);

  state.metrics.push({
    id: "met_durable", assetId: asset.id, channel: "github", capturedAt: "2026-08-13T01:00:00.000Z",
    values: { downloads: 1_000, citations: 100, upstreamReplies: 20 },
  });
  const durable = feedbackDecisions(state)[0];
  assert.equal(durable.adjustment > reachOnly.adjustment, true);
  assert.equal(durable.longTermScore > reachOnly.longTermScore, true);
});
