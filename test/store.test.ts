import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { emptyState, Store } from "../src/store.ts";
import type { LedgerEvent } from "../src/types.ts";

async function fixture(): Promise<{ root: string; store: Store }> {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-store-test-"));
  const store = new Store(root);
  await store.init("test");
  return { root, store };
}

test("a prepared transaction journal recovers both snapshot and ledger", async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = emptyState("2026-08-13T00:00:00.000Z");
  state.revision = 1;
  state.maintenanceCursor = 7;
  const event: LedgerEvent = {
    id: "evt_recovery",
    at: state.updatedAt,
    actor: "test",
    type: "test.recovered",
    revision: 1,
    entityType: "system",
  };
  await writeFile(store.journalPath, `${JSON.stringify({ state, event }, null, 2)}\n`, { mode: 0o600 });

  const recovered = await store.read();
  assert.equal(recovered.revision, 1);
  assert.equal(recovered.maintenanceCursor, 7);
  assert.equal(await store.lastLedgerRevision(), 1);
  await assert.rejects(readFile(store.journalPath, "utf8"), { code: "ENOENT" });
});

test("a journal repairs a snapshot written before its ledger event", async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = emptyState("2026-08-13T00:00:00.000Z");
  state.revision = 1;
  const event: LedgerEvent = {
    id: "evt_ledger_recovery",
    at: state.updatedAt,
    actor: "test",
    type: "test.ledger-recovered",
    revision: 1,
    entityType: "system",
  };
  await writeFile(store.snapshotPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await writeFile(store.journalPath, `${JSON.stringify({ state, event }, null, 2)}\n`, { mode: 0o600 });

  assert.equal(await store.lastLedgerRevision(), 1);
  const ledger = await readFile(store.eventsPath, "utf8");
  assert.match(ledger, /evt_ledger_recovery/);
  await assert.rejects(readFile(store.journalPath, "utf8"), { code: "ENOENT" });
});

test("a legacy transaction journal without interactions migrates during recovery", async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const state = emptyState("2026-08-13T00:00:00.000Z");
  state.revision = 1;
  const legacyState = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  delete legacyState.interactions;
  const event: LedgerEvent = {
    id: "evt_legacy_interactions",
    at: state.updatedAt,
    actor: "test",
    type: "test.legacy-recovery",
    revision: 1,
    entityType: "system",
  };
  await writeFile(store.journalPath, `${JSON.stringify({ state: legacyState, event }, null, 2)}\n`, { mode: 0o600 });

  const recovered = await store.read();
  assert.deepEqual(recovered.interactions, []);
  assert.equal(await store.lastLedgerRevision(), 1);
});

test("ledger inspection detects a missing middle revision even when the last revision exists", async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await store.transact("test", { type: "test.one" }, (state) => { state.maintenanceCursor = 1; });
  await store.transact("test", { type: "test.two" }, (state) => { state.maintenanceCursor = 2; });
  const lines = (await readFile(store.eventsPath, "utf8")).trim().split("\n");
  await writeFile(store.eventsPath, `${[lines[0], lines[2]].join("\n")}\n`);

  const inspection = await store.inspectLedger();
  assert.equal(inspection.ok, false);
  assert.equal(inspection.lastRevision, 2);
  assert.equal(inspection.errors.some((error) => error.includes("revision gap")), true);
});

test("a stale lock holder cannot unlink the replacement owner's lock", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-learn-lock-test-"));
  const store = new Store(root, 0);
  t.after(() => rm(root, { recursive: true, force: true }));
  await store.init("test");
  const internal = store as unknown as {
    acquireLock(actor: string): Promise<{ handle: { close(): Promise<void> }; token: string }>;
    releaseLock(lock: { handle: { close(): Promise<void> }; token: string }): Promise<void>;
  };
  const first = await internal.acquireLock("first");
  const second = await internal.acquireLock("second");
  await internal.releaseLock(first);
  const durableOwner = JSON.parse(await readFile(store.lockPath, "utf8")) as { token: string };
  assert.equal(durableOwner.token, second.token);
  await internal.releaseLock(second);
});

test("a no-op transaction does not manufacture a revision or ledger event", async (t) => {
  const { root, store } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await store.transact("test", { type: "test.no-op" }, () => null);
  assert.equal(result.revision, 0);
  const inspection = await store.inspectLedger();
  assert.equal(inspection.eventCount, 1);
  assert.equal(inspection.lastRevision, 0);
});
