import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeSources, readSourceAttestations } from "../src/source-watch.ts";

test("source watch keeps successful observations when another source fails", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-source-watch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "ops"), { recursive: true });
  await writeFile(join(root, "ops", "sources.json"), JSON.stringify([
    {
      id: "good", label: "good", kind: "npm-latest", url: "https://example.com/good",
      sourceId: "package", enabled: true, scope: "ecosystem",
    },
    {
      id: "bad", label: "bad", kind: "github-head", url: "https://example.com/bad",
      sourceId: "repository", enabled: true,
    },
  ]));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/good")) return new Response(JSON.stringify({ version: "1.2.3" }), { status: 200 });
    return new Response("unavailable", { status: 503 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await observeSources(root, "ops/sources.json", { retryDelayMs: 0 });
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].revision, "1.2.3");
  assert.equal(result.observations[0].definition.scope, "ecosystem");
  assert.deepEqual(result.errors.map((item) => item.id), ["bad"]);
  assert.match(result.errors[0].error, /failed after 3 attempts: HTTP 503/);
});

test("source watch retries transient network failures and preserves the successful revision", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-source-watch-retry-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "ops"), { recursive: true });
  await writeFile(join(root, "ops", "sources.json"), JSON.stringify([
    {
      id: "flaky", label: "flaky", kind: "github-head", url: "https://example.com/flaky",
      sourceId: "repository", enabled: true,
    },
  ]));
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("temporary network failure");
    return new Response(JSON.stringify({ sha: "abc123" }), { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await observeSources(root, "ops/sources.json", { retryDelayMs: 0 });

  assert.equal(attempts, 3);
  assert.equal(result.errors.length, 0);
  assert.equal(result.observations[0].revision, "abc123");
});

test("source watch does not retry a permanent client error", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-source-watch-client-error-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "ops"), { recursive: true });
  await writeFile(join(root, "ops", "sources.json"), JSON.stringify([
    {
      id: "forbidden", label: "forbidden", kind: "npm-latest", url: "https://example.com/forbidden",
      sourceId: "package", enabled: true,
    },
  ]));
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response("forbidden", { status: 403 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await observeSources(root, "ops/sources.json", { retryDelayMs: 0 });

  assert.equal(attempts, 1);
  assert.deepEqual(result.errors, [{ id: "forbidden", error: "Source forbidden returned HTTP 403" }]);
});

test("source attestations resolve public revisions without importing fetched content", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-source-attestation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "ops"), { recursive: true });
  await writeFile(join(root, "ops", "sources.json"), JSON.stringify([
    {
      id: "head", label: "HEAD", kind: "github-head", url: "https://example.com/commit",
      sourceId: "repository", enabled: true,
    },
    {
      id: "disabled", label: "disabled", kind: "npm-latest", url: "https://example.com/npm",
      sourceId: "package", enabled: false,
    },
  ]));
  await writeFile(join(root, "attestations.json"), JSON.stringify([
    { id: "head", revision: "abc123", observedAt: "2026-08-13T12:00:00.000Z" },
  ]));

  const result = await readSourceAttestations(root, "attestations.json");
  assert.equal(result.length, 1);
  assert.equal(result[0].definition.sourceId, "repository");
  assert.equal(result[0].definition.scope, "official");
  assert.equal(result[0].revision, "abc123");
  assert.equal(result[0].observedAt, "2026-08-13T12:00:00.000Z");
  await writeFile(join(root, "attestations.json"), JSON.stringify([
    { id: "disabled", revision: "1.0.0" },
  ]));
  await assert.rejects(readSourceAttestations(root, "attestations.json"), /unknown or disabled source/);
});

test("source attestations reject secret-shaped revisions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-source-attestation-secret-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "ops"), { recursive: true });
  await writeFile(join(root, "ops", "sources.json"), JSON.stringify([{
    id: "head", label: "HEAD", kind: "github-head", url: "https://example.com/commit",
    sourceId: "repository", enabled: true,
  }]));
  const fakeGithubRevision = ["ghp", "123456"].join("_");
  await writeFile(join(root, "attestations.json"), JSON.stringify([
    { id: "head", revision: fakeGithubRevision },
  ]));

  await assert.rejects(readSourceAttestations(root, "attestations.json"), /potential secret/);
});
