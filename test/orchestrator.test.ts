import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Orchestrator } from "../src/orchestrator.ts";
import { loadAdapters } from "../src/adapters/registry.ts";
import type { ChannelAdapter } from "../src/adapters/types.ts";
import type { AssetValidationDraft, EvidenceDraft, OpportunityDraft } from "../src/input.ts";
import type { AdapterLoader } from "../src/orchestrator.ts";
import type { Interaction } from "../src/types.ts";

const opportunity: OpportunityDraft = {
  title: "Official DSH change",
  summary: "Explain a verified upstream change",
  sourceType: "official",
  sourceUrl: "https://github.com/deepseek-ai/deepseek-harness/commit/example",
  observedAt: "2026-08-13T00:00:00.000Z",
  directDshAction: true,
  audience: ["DSH users"],
  proposedAssets: ["migration-card"],
  signals: {
    userImpact: 95, freshness: 95, compounding: 90,
    ecosystemValue: 90, evidenceConfidence: 100, executability: 95,
  },
  risk: "LOW",
};

const evidence: EvidenceDraft = {
  claim: "The upstream change is present at the pinned commit.",
  kind: "OFFICIAL_SOURCE",
  sources: [{
    url: "https://github.com/deepseek-ai/deepseek-harness/commit/example",
    title: "Pinned commit",
    kind: "official",
    accessedAt: "2026-08-13T00:00:00.000Z",
  }],
  baseline: { repository: "deepseek-ai/deepseek-harness", commit: "example" },
  confidence: 100,
};

const assetValidation: AssetValidationDraft = {
  kind: "content-review",
  result: "PASS",
  notes: "Test fixture content reviewed against its evidence pack.",
  checkedAt: "2026-08-13T00:30:00.000Z",
};

async function fixture(githubEnabled = false, adapterLoader?: AdapterLoader): Promise<{ root: string; ops: Orchestrator }> {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-test-"));
  await mkdir(join(root, "ops"), { recursive: true });
  await mkdir(join(root, "content"), { recursive: true });
  const unavailable = { enabled: false, mode: "UNAVAILABLE", reason: "not configured" };
  await writeFile(join(root, "ops", "channels.json"), JSON.stringify({
    github: githubEnabled ? { enabled: true, mode: "DRAFT_ONLY" } : unavailable,
    weibo: githubEnabled ? { enabled: true, mode: "DRAFT_ONLY" } : unavailable,
    zhihu: unavailable, wechat: unavailable,
    x: { enabled: false, mode: "DISABLED", reason: "disabled" },
  }));
  await writeFile(join(root, "AUTONOMOUS_PLAN.md"), "test policy");
  const ops = new Orchestrator(root, adapterLoader);
  await ops.init("test");
  return { root, ops };
}

test("32 concurrent claimers produce one lease owner", async (t) => {
  const { root, ops } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await ops.scan([opportunity], "scout");
  const claims = await Promise.all(Array.from({ length: 32 }, (_, index) => ops.claimNext(`worker-${index}`)));
  assert.equal(claims.filter(Boolean).length, 1);
  const state = await ops.store.read();
  assert.equal(state.opportunities.filter((item) => item.status === "CLAIMED").length, 1);
});

test("the orchestrator caps active workers at four and prevents one worker from holding two leases", async (t) => {
  const { root, ops } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await ops.scan(Array.from({ length: 5 }, (_, index) => ({
    ...opportunity,
    title: `Parallel DSH opportunity ${index}`,
    summary: `Independent verified change ${index}`,
  })), "scout");

  const claims = [];
  for (let index = 0; index < 4; index += 1) {
    claims.push(await ops.claimNext(`worker-${index}`));
  }
  assert.equal(claims.filter(Boolean).length, 4);
  assert.equal(await ops.claimNext("worker-0"), null);
  assert.equal(await ops.claimNext("worker-4"), null);
  assert.deepEqual((await ops.status()).workerCapacity, { max: 4, active: 4, available: 0 });
});

test("equal-score opportunity ordering is stable across input order", async (t) => {
  const first = await fixture();
  const second = await fixture();
  t.after(() => Promise.all([
    rm(first.root, { recursive: true, force: true }),
    rm(second.root, { recursive: true, force: true }),
  ]));
  const a = { ...opportunity, title: "Alpha", summary: "Alpha summary" };
  const b = { ...opportunity, title: "Beta", summary: "Beta summary" };
  await first.ops.scan([a, b], "scout");
  await second.ops.scan([b, a], "scout");
  assert.deepEqual(
    (await first.ops.next()).map((item) => item.title),
    (await second.ops.next()).map((item) => item.title),
  );
});

test("verified asset reaches mock channel without pretending to be publicly published", async (t) => {
  const { root, ops } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  assert.equal(ready.asset.status, "READY");
  const [job] = await ops.queuePublish(ready.asset.id, { local: "content/card.md" });
  const sent = await ops.dispatch(job.id, true);
  assert.equal(sent.status, "SUCCEEDED");
  const state = await ops.store.read();
  assert.equal(state.assets[0].status, "READY");
  assert.equal(state.opportunities[0].status, "READY");
  const duplicate = await ops.queuePublish(ready.asset.id, { local: "content/card.md" });
  assert.equal(duplicate[0].id, job.id);
});

test("a published asset can add a new channel without invalidating its existing receipt", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Published card\n");
  await writeFile(join(root, "content", "social.md"), "# Social variant\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Published card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [githubJob] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  await ops.dispatch(githubJob.id);
  await ops.recordReceipt(githubJob.id, {
    remoteId: "github-commit-1",
    url: "https://github.com/example/repo/blob/main/content/card.md",
    publishedAt: "2026-08-13T01:00:00.000Z",
  });

  const [weiboJob] = await ops.queuePublish(ready.asset.id, { weibo: "content/social.md" });
  assert.equal(weiboJob.status, "QUEUED");
  const state = await ops.store.read();
  assert.equal(state.assets[0].status, "PUBLISHED");
  assert.equal(state.publishJobs.find((job) => job.id === githubJob.id)?.status, "SUCCEEDED");
  assert.equal(state.publishJobs.find((job) => job.id === weiboJob.id)?.status, "QUEUED");
});

test("queued dispatcher only writes DRAFT_ONLY outboxes and skips mock jobs", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Draft-only card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "faq", title: "Draft-only card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const jobs = await ops.queuePublish(ready.asset.id, {
    github: "content/card.md",
    local: "content/card.md",
  });

  const result = await ops.dispatchQueued();
  assert.deepEqual(result.errors, []);
  assert.equal(result.dispatched.length, 1);
  assert.equal(result.dispatched[0].channel, "github");
  assert.equal(result.dispatched[0].status, "OUTBOX");
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].id, jobs.find((job) => job.channel === "local")?.id);
  assert.match(result.skipped[0].reason, /MOCK|测试/);
  const githubJob = jobs.find((job) => job.channel === "github");
  assert.ok(githubJob);
  const outbox = JSON.parse(await readFile(join(root, "outbox", "github", `${githubJob.dedupeKey}.json`), "utf8")) as {
    action: string;
    channel: string;
    content: string;
  };
  assert.equal(outbox.action, "publish");
  assert.equal(outbox.channel, "github");
  assert.equal(outbox.content, "# Draft-only card\n");
  const state = await ops.store.read();
  assert.equal(state.publishJobs.find((job) => job.channel === "local")?.status, "QUEUED");
});

test("a channel requiring user approval cannot be dispatched by cycle", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "ops", "channels.json"), JSON.stringify({
    github: { enabled: true, mode: "DRAFT_ONLY" },
    weibo: { enabled: true, mode: "DRAFT_ONLY" },
    zhihu: { enabled: true, mode: "DRAFT_ONLY", requiresApproval: true },
    wechat: { enabled: false, mode: "UNAVAILABLE", reason: "not configured" },
    x: { enabled: false, mode: "DISABLED", reason: "disabled" },
  }));
  await writeFile(join(root, "content", "card.md"), "# Approval-gated card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Approval-gated card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { zhihu: "content/card.md" });

  const skipped = await ops.dispatchQueued();
  assert.equal(skipped.dispatched.length, 0);
  assert.match(skipped.skipped[0]?.reason ?? "", /需要主理人明确批准/);
  await assert.rejects(ops.dispatch(job.id), /requires explicit user approval/);
  await assert.rejects(ops.recordReceipt(job.id, {
    remoteId: "unapproved",
    url: "https://zhihu.com/p/never-published",
    publishedAt: "2026-08-13T01:00:00.000Z",
  }), /requires explicit user approval/);

  const approved = await ops.approvePublish(job.id, "主理人", "本次明确同意知乎发布");
  assert.equal(approved.userApproval?.approvedBy, "主理人");
  const outbox = await ops.dispatch(job.id);
  assert.equal(outbox.status, "OUTBOX");
  const payload = JSON.parse(await readFile(join(root, "outbox", "zhihu", `${job.dedupeKey}.json`), "utf8")) as {
    requiresUserApproval: boolean;
    userApproval?: { approvedBy: string };
  };
  assert.equal(payload.requiresUserApproval, true);
  assert.equal(payload.userApproval?.approvedBy, "主理人");
});

test("channel failure is job-local and stale evidence cancels queued jobs", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  assert.equal(job.status, "QUEUED");
  const stale = await ops.markSourceChanged(evidence.sources[0].url, "next-commit");
  assert.deepEqual(stale, { evidence: 1, assets: 1, jobs: 1 });
  const state = await ops.store.read();
  assert.equal(state.publishJobs[0].status, "CANCELLED");
  assert.equal(state.assets[0].status, "STALE");
  assert.equal(state.opportunities[0].status, "READY");
  assert.equal(state.opportunities.some((item) => item.sourceType === "maintenance"), true);
});

test("unavailable channels do not block the opportunity aggregate", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  assert.equal(job.status, "BLOCKED_CHANNEL");
  const state = await ops.store.read();
  assert.equal(state.opportunities[0].status, "READY");
});

test("cycle reconciles, explains the next choice and only claims with a worker", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await ops.scan([opportunity], "scout");
  const inspection = await ops.cycle();
  assert.equal(inspection.action, "WORK_AVAILABLE");
  const stateBefore = await ops.store.read();
  assert.equal(stateBefore.opportunities[0].status, "TRIAGED");
  const claimed = await ops.cycle("worker-cycle");
  assert.equal(claimed.action, "CLAIMED");
  const stateAfter = await ops.store.read();
  assert.equal(stateAfter.opportunities[0].status, "CLAIMED");
});

test("metrics reject negative counters and feedback analysis is idempotent", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  await assert.rejects(
    ops.addMetric({ assetId: registered.asset.id, channel: "github", values: { views: -1 } }),
    /non-negative/,
  );
  await ops.addMetric({
    assetId: registered.asset.id, channel: "github",
    values: { views: 10_000, downloads: 1_000, citations: 100 },
  });
  const first = await ops.analyzeFeedback();
  assert.equal(first.changed, 1);
  const revision = (await ops.store.read()).revision;
  const second = await ops.analyzeFeedback();
  assert.equal(second.changed, 0);
  assert.equal((await ops.store.read()).revision, revision);
});

test("a published job can be corrected without deleting its receipt history", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Version one\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [job] = await ops.queuePublish(registered.asset.id, { local: "content/card.md" });
  const original = await ops.dispatch(job.id, true);
  await writeFile(join(root, "content", "card.md"), "# Version two with a factual correction\n");
  const revised = await ops.reviseAsset(registered.asset.id, assetValidation);
  assert.equal(revised.changed, true);
  const correction = await ops.queueCorrection(original.id, "content/card.md");
  assert.equal(correction.correctionOf, original.id);
  const corrected = await ops.dispatch(correction.id, true);
  assert.equal(corrected.status, "SUCCEEDED");
  assert.equal(corrected.remoteId, original.remoteId);
  const originalKey = original.remoteId!.slice("local:".length);
  assert.equal(
    await readFile(join(root, "outbox", "local", `${originalKey}.md`), "utf8"),
    "# Version two with a factual correction\n",
  );
  const state = await ops.store.read();
  assert.equal(state.publishJobs.filter((item) => item.status === "SUCCEEDED").length, 2);
});

test("a channel agent can explicitly preserve an uncertain external publish state", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Uncertain card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Uncertain card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  await ops.dispatch(job.id);
  const uncertain = await ops.markRemoteUnknown(job.id, "浏览器已提交，但公开页面尚未确认");
  assert.equal(uncertain.status, "UNKNOWN_REMOTE_STATE");
  await assert.rejects(
    ops.markRemoteUnknown(job.id, `token=${["ghp_", "0123456789012345678901234567890123456789"].join("")}`),
    /potential secret/,
  );
});

test("published interactions are deduplicated and feed durable metrics", async (t) => {
  const interactionFixtures: Interaction[] = [
    {
      id: "remote-comment-1", channel: "local", remoteId: "comment-1", kind: "comment",
      body: "这个实验很容易复现。", observedAt: "2026-08-13T01:00:00.000Z",
    },
    {
      id: "remote-citation-1", channel: "local", remoteId: "citation-1", kind: "citation",
      body: "引用到团队内部的迁移笔记。", observedAt: "2026-08-13T01:01:00.000Z",
    },
  ];
  const interactionLoader: AdapterLoader = async (candidateRoot) => {
    const adapters = await loadAdapters(candidateRoot);
    const base = adapters.get("local")!;
    const withInteractions: ChannelAdapter = {
      id: "local",
      probe: () => base.probe(),
      publish: (job, content) => base.publish(job, content),
      reconcile: (job) => base.reconcile(job),
      correct: (job, content) => base.correct(job, content),
      fetchInteractions: async () => interactionFixtures,
    };
    adapters.set("local", withInteractions);
    return adapters;
  };
  const { root, ops } = await fixture(false, interactionLoader);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Interaction card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Interaction card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { local: "content/card.md" });
  const published = await ops.dispatch(job.id, true);

  const first = await ops.collectInteractions(published.id);
  assert.equal(first.added.length, 2);
  assert.deepEqual(first.metric?.values, { comments: 1, citations: 1 });
  const second = await ops.collectInteractions(published.id);
  assert.equal(second.added.length, 0);
  assert.deepEqual(await ops.syncInteractions(), { jobs: 1, added: 0, errors: [] });

  const analysis = await ops.analyzeFeedback();
  assert.equal(analysis.changed, 1);
  const state = await ops.store.read();
  assert.equal(state.interactions.length, 2);
  assert.equal(state.metrics.length, 1);
  assert.equal(state.opportunities[0].feedback?.sampleCount, 1);
});

test("a blocked channel is reactivated after its capability becomes available", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [job] = await ops.queuePublish(registered.asset.id, { github: "content/card.md" });
  assert.equal(job.status, "BLOCKED_CHANNEL");
  const unavailable = { enabled: false, mode: "UNAVAILABLE", reason: "not configured" };
  await writeFile(join(root, "ops", "channels.json"), JSON.stringify({
    github: { enabled: true, mode: "DRAFT_ONLY" },
    weibo: unavailable, zhihu: unavailable, wechat: unavailable,
    x: { enabled: false, mode: "DISABLED", reason: "disabled" },
  }));
  const reconciled = await ops.reconcile();
  assert.equal(reconciled.reactivatedJobs, 1);
  assert.equal((await ops.store.read()).publishJobs[0].status, "QUEUED");
});

test("worker failure retries once and then archives the single opportunity", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await ops.scan([opportunity], "scout");
  const first = await ops.claimNext("worker");
  assert.ok(first?.lease);
  const retried = await ops.failOpportunity({
    opportunityId: first.id, worker: "worker", leaseToken: first.lease.token,
    aggregateRevision: first.revision, reason: "temporary tool failure",
  });
  assert.equal(retried.status, "TRIAGED");
  const second = await ops.claimNext("worker-2");
  assert.ok(second?.lease);
  const archived = await ops.failOpportunity({
    opportunityId: second.id, worker: "worker-2", leaseToken: second.lease.token,
    aggregateRevision: second.revision, reason: "same tool failure after retry",
  });
  assert.equal(archived.status, "ARCHIVED");
  assert.equal(archived.failureCount, 2);
});

test("a newer channel variant cancels the older unsent variant", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Canonical\n");
  await writeFile(join(root, "content", "variant-one.md"), "first channel version\n");
  await writeFile(join(root, "content", "variant-two.md"), "second channel version\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [first] = await ops.queuePublish(registered.asset.id, { github: "content/variant-one.md" });
  const [second] = await ops.queuePublish(registered.asset.id, { github: "content/variant-two.md" });
  assert.notEqual(first.id, second.id);
  const state = await ops.store.read();
  assert.equal(state.publishJobs.find((item) => item.id === first.id)?.status, "CANCELLED");
  assert.equal(state.publishJobs.find((item) => item.id === second.id)?.status, "BLOCKED_CHANNEL");
  const [restored] = await ops.queuePublish(registered.asset.id, { github: "content/variant-one.md" });
  assert.equal(restored.id, first.id);
  const restoredState = await ops.store.read();
  assert.equal(restoredState.publishJobs.find((item) => item.id === first.id)?.status, "BLOCKED_CHANNEL");
  assert.equal(restoredState.publishJobs.find((item) => item.id === second.id)?.status, "CANCELLED");
});

test("an outbox becomes unknown on staleness and a late receipt stays historical", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Version one\n");
  await writeFile(join(root, "content", "variant-two.md"), "# Version two\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const [job] = await ops.queuePublish(registered.asset.id, { github: "content/card.md" });
  await assert.rejects(
    ops.recordReceipt(job.id, {
      remoteId: "not-dispatched", url: "https://github.com/example/not-dispatched",
      publishedAt: "2026-08-13T01:00:00.000Z",
    }),
    /Cannot attach receipt to QUEUED/,
  );
  const outbox = await ops.dispatch(job.id);
  assert.equal(outbox.status, "OUTBOX");
  await assert.rejects(
    ops.recordReceipt(job.id, {
      remoteId: "bad-file", url: "file:///tmp/fake-receipt",
      publishedAt: "2026-08-13T01:00:00.000Z",
    }),
    /must use https/,
  );
  await assert.rejects(
    ops.queuePublish(registered.asset.id, { github: "content/variant-two.md" }),
    /uncertain publish job/,
  );
  await ops.markSourceChanged(evidence.sources[0].url, "new-revision");
  assert.equal((await ops.store.read()).publishJobs[0].status, "UNKNOWN_REMOTE_STATE");
  await ops.recordReceipt(job.id, {
    remoteId: "remote-original", url: "https://github.com/example/original",
    publishedAt: "2026-08-13T02:00:00.000Z",
  });
  const state = await ops.store.read();
  assert.equal(state.publishJobs[0].status, "SUCCEEDED");
  assert.equal(state.assets[0].status, "STALE");
  assert.equal(state.opportunities[0].status, "READY");
});

test("a channel-confirmed missing remote can move from unknown to a safe retry", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Retryable local card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(registered.asset.id, { local: "content/card.md" });
  await ops.store.transact("test", { type: "test.force-unknown" }, (state) => {
    state.publishJobs[0].status = "UNKNOWN_REMOTE_STATE";
  });

  const result = await ops.reconcile();
  assert.deepEqual(result.retryableJobs, [job.id]);
  assert.equal((await ops.store.read()).publishJobs[0].status, "RETRYABLE_FAILED");
  const retried = await ops.retryPublish(job.id);
  assert.equal(retried.status, "QUEUED");
});

test("an exhausted publish job is cancelled instead of being retried indefinitely", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Exhausted card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Exhausted card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  await ops.store.transact("test", { type: "test.exhaust-publish" }, (state) => {
    const current = state.publishJobs.find((item) => item.id === job.id)!;
    current.status = "RETRYABLE_FAILED";
    current.attempts = 2;
  });

  const cancelled = await ops.retryPublish(job.id);
  assert.equal(cancelled.status, "CANCELLED");
  assert.match(cancelled.blockedReason ?? "", /最多 2 次/);
  await assert.rejects(ops.retryPublish(job.id), /not retryable: CANCELLED/);
});

test("manual remote absence confirmation archives stale jobs and requeues current revisions safely", async (t) => {
  const { root, ops } = await fixture(true);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Stale card\n");
  await writeFile(join(root, "content", "card-v2.md"), "# Current card\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  const ready = await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const [job] = await ops.queuePublish(ready.asset.id, { github: "content/card.md" });
  await ops.store.transact("test", { type: "test.force-unknown" }, (state) => {
    state.publishJobs.find((item) => item.id === job.id)!.status = "UNKNOWN_REMOTE_STATE";
  });
  await ops.reviseAsset(ready.asset.id, assetValidation, "content/card-v2.md");
  const archived = await ops.confirmMissingRemote(job.id, "GitHub connector returned 404 for the exact path");
  assert.equal(archived.status, "CANCELLED");
  assert.match(archived.blockedReason ?? "", /过期版本重试/);

  const current = await ops.queuePublish(ready.asset.id, { github: "content/card-v2.md" });
  assert.equal(current.length, 1);
  assert.equal(current[0].status, "QUEUED");
});

test("an exhausted maintenance task does not create a busy-loop or crash claim-next", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Verified migration card\n");
  await ops.scan([opportunity], "scout");
  const source = await ops.claimNext("researcher");
  assert.ok(source?.lease);
  const verified = await ops.verify(source.id, "researcher", source.lease.token, source.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: source.id, worker: "researcher", leaseToken: source.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: source.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  await ops.markSourceChanged(evidence.sources[0].url, "next");
  const first = await ops.claimNext("maintenance-1");
  assert.ok(first?.lease);
  await ops.failOpportunity({
    opportunityId: first.id, worker: "maintenance-1", leaseToken: first.lease.token,
    aggregateRevision: first.revision, reason: "same maintenance blocker",
  });
  const second = await ops.claimNext("maintenance-2");
  assert.ok(second?.lease);
  await ops.failOpportunity({
    opportunityId: second.id, worker: "maintenance-2", leaseToken: second.lease.token,
    aggregateRevision: second.revision, reason: "same maintenance blocker",
  });
  assert.equal(await ops.claimNext("maintenance-3"), null);
});

test("an empty queue creates one bounded routine maintenance task and refreshes it on completion", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Routine maintenance card\n");
  await ops.scan([opportunity], "scout");
  const source = await ops.claimNext("researcher");
  assert.ok(source?.lease);
  const verified = await ops.verify(source.id, "researcher", source.lease.token, source.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: source.id, worker: "researcher", leaseToken: source.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Routine card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: source.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const oldCheckedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  await ops.store.transact("test", { type: "test.age-validation" }, (state) => {
    state.assets[0].validation!.checkedAt = oldCheckedAt;
  });

  const maintenance = await ops.claimNext("maintenance-routine");
  assert.ok(maintenance?.lease);
  assert.match(maintenance.title, /^例行复测/);
  const completed = await ops.completeMaintenance({
    opportunityId: maintenance.id,
    worker: "maintenance-routine",
    leaseToken: maintenance.lease.token,
    aggregateRevision: maintenance.revision,
    validation: { ...assetValidation, checkedAt: new Date().toISOString() },
  });
  assert.equal(completed.opportunity.status, "ARCHIVED");
  assert.notEqual(completed.asset.validation?.checkedAt, oldCheckedAt);
  assert.equal(await ops.claimNext("maintenance-after-complete"), null);
});

test("stale evidence requires a new baseline before the unchanged asset can be revalidated", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Version-bound tutorial\n");
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  await ops.markSourceChanged("deepseek-ai/deepseek-harness", "next-commit");
  await assert.rejects(ops.augmentEvidence(verified.evidence.id, evidence), /updated baseline/);
  const updatedEvidence: EvidenceDraft = {
    ...evidence,
    sources: [...evidence.sources, {
      url: "https://github.com/deepseek-ai/deepseek-harness/commit/next-commit",
      title: "Updated pinned commit", kind: "repository", accessedAt: "2026-08-13T03:00:00.000Z",
    }],
    baseline: { ...evidence.baseline, commit: "next-commit" },
  };
  await ops.augmentEvidence(verified.evidence.id, updatedEvidence);
  const revalidated = await ops.reviseAsset(registered.asset.id, assetValidation);
  assert.equal(revalidated.changed, true);
  assert.equal(revalidated.asset.status, "READY");
  assert.equal(revalidated.asset.sourceRefs.every((item) => item.commit === "next-commit"), true);
  const finalState = await ops.store.read();
  assert.equal(finalState.opportunities.some((item) => item.sourceType === "maintenance" && item.status === "TRIAGED"), false);
});

test("the first source watch invalidates evidence whose stored baseline is already old", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Old baseline\n");
  await writeFile(join(root, "ops", "sources-first.json"), JSON.stringify([{
    id: "head", label: "Harness HEAD", kind: "github-head",
    url: "https://api.github.com/repos/deepseek-ai/deepseek-harness/commits/master",
    sourceId: "deepseek-ai/deepseek-harness", enabled: true,
  }]));
  await ops.scan([opportunity], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, evidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Migration card",
    canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision,
    validation: assetValidation,
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ sha: "new-head" }), {
    status: 200, headers: { "content-type": "application/json" },
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await ops.scanSources("ops/sources-first.json") as {
    changed: Array<{ initialized?: boolean }>;
  };
  assert.equal(result.changed.length, 1);
  assert.equal(result.changed[0].initialized, true);
  const state = await ops.store.read();
  assert.equal(state.evidence[0].status, "STALE");
  assert.equal(state.assets[0].status, "STALE");
});

test("a fixed-commit document URL maps to its logical watched source", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "content", "card.md"), "# Watched document\n");
  const documentEvidence: EvidenceDraft = {
    ...evidence,
    sources: [{
      url: "https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/cordis-primer.zh.md",
      title: "Cordis primer", kind: "official", accessedAt: "2026-08-13T00:00:00.000Z",
    }],
  };
  await ops.scan([{ ...opportunity, title: "Watched document opportunity" }], "scout");
  const claim = await ops.claimNext("researcher");
  assert.ok(claim?.lease);
  const verified = await ops.verify(claim.id, "researcher", claim.lease.token, claim.revision, documentEvidence);
  const registered = await ops.registerAsset({
    opportunityId: claim.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: verified.opportunity.revision, type: "tutorial", title: "Watched document", canonicalPath: "content/card.md",
  });
  await ops.readyAsset({
    assetId: registered.asset.id, worker: "researcher", leaseToken: claim.lease.token,
    aggregateRevision: registered.opportunity.revision, validation: assetValidation,
  });
  const impact = await ops.markSourceChanged("deepseek-ai/deepseek-harness/docs/cordis-primer.zh.md", "new-doc-hash");
  assert.deepEqual(impact, { evidence: 1, assets: 1, jobs: 0 });
  assert.equal((await ops.store.read()).assets[0].status, "STALE");
});

test("source health retains partial failures and clears after recovery", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "ops", "sources-health.json"), JSON.stringify([
    {
      id: "good", label: "good", kind: "npm-latest", url: "https://example.com/good",
      sourceId: "package", enabled: true,
    },
    {
      id: "bad", label: "bad", kind: "github-head", url: "https://example.com/bad",
      sourceId: "repository", enabled: true,
    },
  ]));
  let recovered = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/good")) return new Response(JSON.stringify({ version: "1.2.3" }), { status: 200 });
    if (!recovered) throw new Error("network down");
    return new Response(JSON.stringify({ sha: "head-1" }), { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const first = await ops.scanSources("ops/sources-health.json") as { errors: Array<{ id: string }> };
  assert.deepEqual(first.errors.map((item) => item.id), ["bad"]);
  const degraded = await ops.doctor();
  assert.equal((degraded.sourceHealth as { ok: boolean }).ok, false);
  assert.equal((await ops.store.read()).sourceErrors.length, 1);

  recovered = true;
  const second = await ops.scanSources("ops/sources-health.json") as { errors: unknown[] };
  assert.deepEqual(second.errors, []);
  const healthy = await ops.doctor();
  assert.equal((healthy.sourceHealth as { ok: boolean }).ok, true);
  assert.equal((await ops.store.read()).sourceErrors.length, 0);
});

test("connector source attestations clear only the attested error and preserve cursor semantics", async (t) => {
  const { root, ops } = await fixture(false);
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "ops", "sources-attest.json"), JSON.stringify([
    {
      id: "head", label: "Harness HEAD", kind: "github-head", url: "https://example.com/head",
      sourceId: "deepseek-ai/deepseek-harness", enabled: true,
    },
    {
      id: "docs", label: "Harness docs", kind: "content-hash", url: "https://example.com/docs",
      sourceId: "deepseek-ai/deepseek-harness/docs/example.md", enabled: true,
    },
  ]));
  await writeFile(join(root, "attestations.json"), JSON.stringify([
    { id: "head", revision: "head-1", observedAt: "2026-08-13T12:00:00.000Z" },
  ]));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("offline", { status: 503 });
  t.after(() => { globalThis.fetch = originalFetch; });
  await ops.scanSources("ops/sources-attest.json");
  assert.equal((await ops.store.read()).sourceErrors.length, 2);

  const first = await ops.attestSources("attestations.json", "ops/sources-attest.json");
  assert.deepEqual(first.initialized, ["head"]);
  let state = await ops.store.read();
  assert.deepEqual(state.sourceCursors.map((item) => [item.id, item.revision]), [["head", "head-1"]]);
  assert.deepEqual(state.sourceErrors.map((item) => item.id), ["docs"]);

  await writeFile(join(root, "attestations.json"), JSON.stringify([
    { id: "head", revision: "head-2", observedAt: "2026-08-13T12:01:00.000Z" },
  ]));
  const changed = await ops.attestSources("attestations.json", "ops/sources-attest.json");
  assert.equal(changed.changed.length, 1);
  state = await ops.store.read();
  assert.equal(state.sourceCursors[0].revision, "head-2");
  assert.deepEqual(state.sourceErrors.map((item) => item.id), ["docs"]);
});
