import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AgentBridgeAdapter } from "../src/adapters/agent-bridge.ts";
import type { PublishJob } from "../src/types.ts";

const job = { id: "pub_bridge_test", channel: "github" } as PublishJob;

test("agent bridge reads private interaction snapshots and keeps the publish binding", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-bridge-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new AgentBridgeAdapter("github", root, { enabled: true, mode: "DRAFT_ONLY" });

  assert.deepEqual(await adapter.fetchInteractions(job), []);
  const directory = join(root, "state", "private", "interactions", "github");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${job.id}.json`), JSON.stringify({
    schemaVersion: 1,
    jobId: job.id,
    channel: "github",
    interactions: [
      {
        remoteId: "comment-1",
        kind: "comment",
        observedAt: "2026-08-13T19:30:00.000Z",
        body: "公开评论",
      },
      {
        remoteId: "citation-1",
        kind: "citation",
        observedAt: "2026-08-13T19:31:00.000Z",
      },
    ],
  }));

  assert.deepEqual(await adapter.fetchInteractions(job), [
    {
      id: `bridge-${job.id}-0`,
      channel: "github",
      remoteId: "comment-1",
      kind: "comment",
      observedAt: "2026-08-13T19:30:00.000Z",
      body: "公开评论",
    },
    {
      id: `bridge-${job.id}-1`,
      channel: "github",
      remoteId: "citation-1",
      kind: "citation",
      observedAt: "2026-08-13T19:31:00.000Z",
    },
  ]);
});

test("agent bridge rejects a snapshot bound to another job or containing secrets", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-bridge-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new AgentBridgeAdapter("github", root, { enabled: true, mode: "DRAFT_ONLY" });
  const directory = join(root, "state", "private", "interactions", "github");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${job.id}.json`);

  await writeFile(path, JSON.stringify({
    schemaVersion: 1,
    jobId: "pub_other",
    channel: "github",
    interactions: [],
  }));
  await assert.rejects(adapter.fetchInteractions(job), /jobId does not match/);

  const fakeSecret = ["sk", "test-secret-value"].join("-");
  await writeFile(path, JSON.stringify({
    schemaVersion: 1,
    jobId: job.id,
    channel: "github",
    interactions: [{ remoteId: "comment-1", kind: "comment", observedAt: "2026-08-13T19:30:00.000Z", body: fakeSecret }],
  }));
  await assert.rejects(adapter.fetchInteractions(job), /potential secret/);
});
