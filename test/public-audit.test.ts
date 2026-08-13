import assert from "node:assert/strict";
import test from "node:test";
import { auditPublicText } from "../src/public-audit.ts";

test("public audit catches personal paths and high-confidence secrets", () => {
  const githubToken = ["ghp", "123456789012345678901234"].join("_");
  const findings = auditPublicText("draft.md", `path=/Users/pingfan/private/x\ntoken=${githubToken}`);
  assert.equal(findings.length, 2);
});

test("public audit allows placeholders and generic fixture names", () => {
  const findings = auditPublicText("README.md", "apiKeyEnv: DSH_PROVIDER_API_KEY\nbaseURL: https://gateway.example/v1");
  assert.deepEqual(findings, []);
});
