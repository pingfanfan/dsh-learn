import { appendFile, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FileHandle } from "node:fs/promises";
import { makeId } from "./id.ts";
import { containsPotentialSecret, redactSecrets } from "./risk.ts";
import type { LedgerEvent, StateSnapshot } from "./types.ts";
import { assertState } from "./validation.ts";

export interface EventDescriptor {
  type: string;
  entityType?: LedgerEvent["entityType"];
  entityId?: string;
  details?: Record<string, unknown>;
}

export interface TransactionResult<T> {
  result: T;
  revision: number;
}

export interface LedgerInspection {
  ok: boolean;
  eventCount: number;
  lastRevision: number | null;
  errors: string[];
}

interface HeldLock {
  handle: FileHandle;
  token: string;
}

interface TransactionJournal {
  state: StateSnapshot;
  event: LedgerEvent;
}

export class StateLockedError extends Error {}

export function emptyState(now = new Date().toISOString()): StateSnapshot {
  return {
    schemaVersion: 1,
    revision: 0,
    opportunities: [],
    evidence: [],
    assets: [],
    publishJobs: [],
    metrics: [],
    interactions: [],
    sourceCursors: [],
    sourceErrors: [],
    maintenanceCursor: 0,
    updatedAt: now,
  };
}

export class Store {
  readonly root: string;
  readonly staleLockMs: number;
  readonly stateDir: string;
  readonly snapshotPath: string;
  readonly eventsPath: string;
  readonly lockPath: string;
  readonly journalPath: string;

  constructor(root: string, staleLockMs = 120_000) {
    this.root = root;
    this.staleLockMs = staleLockMs;
    this.stateDir = join(root, "state");
    this.snapshotPath = join(this.stateDir, "snapshot.json");
    this.eventsPath = join(this.stateDir, "events.jsonl");
    this.lockPath = join(this.stateDir, ".lock");
    this.journalPath = join(this.stateDir, ".transaction.json");
  }

  async init(actor = "orchestrator"): Promise<void> {
    await mkdir(this.stateDir, { recursive: true });
    try {
      await writeFile(this.snapshotPath, `${JSON.stringify(emptyState(), null, 2)}\n`, { flag: "wx", mode: 0o600 });
      const event: LedgerEvent = {
        id: makeId("evt"),
        at: new Date().toISOString(),
        actor,
        type: "system.initialized",
        revision: 0,
        entityType: "system",
      };
      await appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
    } catch (error) {
      if (!isCode(error, "EEXIST")) throw error;
      await writeFile(this.eventsPath, "", { flag: "a", mode: 0o600 });
    }
  }

  async read(): Promise<StateSnapshot> {
    await this.init();
    if (await this.hasJournal()) {
      const lock = await this.acquireLock("transaction-recovery");
      try {
        await this.recoverJournalLocked();
      } finally {
        await this.releaseLock(lock);
      }
    }
    return this.readSnapshot();
  }

  private async readSnapshot(): Promise<StateSnapshot> {
    const raw = await readFile(this.snapshotPath, "utf8");
    const state = JSON.parse(raw) as StateSnapshot;
    if (!Array.isArray(state.sourceCursors)) state.sourceCursors = [];
    if (!Array.isArray(state.interactions)) state.interactions = [];
    if (!Array.isArray(state.sourceErrors)) state.sourceErrors = [];
    assertState(state);
    return state;
  }

  async transact<T>(
    actor: string,
    event: EventDescriptor,
    mutate: (state: StateSnapshot) => T,
  ): Promise<TransactionResult<T>> {
    await this.init(actor);
    const lock = await this.acquireLock(actor);
    try {
      await this.recoverJournalLocked();
      const state = await this.readSnapshot();
      const beforeMutation = JSON.stringify(state);
      const result = mutate(state);
      if (JSON.stringify(state) === beforeMutation) return { result, revision: state.revision };
      state.revision += 1;
      state.updatedAt = new Date().toISOString();
      assertState(state);
      const serialized = `${JSON.stringify(state, null, 2)}\n`;
      if (containsPotentialSecret(serialized)) throw new Error("Refusing to persist state containing a potential secret");
      const unsafeLedgerEvent: LedgerEvent = {
        id: makeId("evt"),
        at: state.updatedAt,
        actor,
        type: event.type,
        revision: state.revision,
        entityType: event.entityType,
        entityId: event.entityId,
        details: event.details,
      };
      const ledgerEvent = JSON.parse(redactSecrets(JSON.stringify(unsafeLedgerEvent))) as LedgerEvent;
      const journal = `${JSON.stringify({ state, event: ledgerEvent } satisfies TransactionJournal, null, 2)}\n`;
      if (containsPotentialSecret(journal)) throw new Error("Refusing to persist a transaction journal containing a potential secret");

      // The journal makes the snapshot + event pair recoverable if the process
      // exits between either durable write. It is removed only after both land.
      await this.writeAtomic(this.journalPath, journal);
      await this.writeAtomic(this.snapshotPath, serialized);
      const line = JSON.stringify(ledgerEvent);
      await appendFile(this.eventsPath, `${line}\n`, "utf8");
      await unlink(this.journalPath);
      return { result, revision: state.revision };
    } finally {
      await this.releaseLock(lock);
    }
  }

  async lastLedgerRevision(): Promise<number | null> {
    await this.init();
    if (await this.hasJournal()) await this.read();
    return this.readLastLedgerRevision();
  }

  async inspectLedger(): Promise<LedgerInspection> {
    await this.init();
    if (await this.hasJournal()) await this.read();
    const raw = await readFile(this.eventsPath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const errors: string[] = [];
    const events: LedgerEvent[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      try {
        events.push(JSON.parse(lines[index]) as LedgerEvent);
      } catch {
        errors.push(`ledger line ${index + 1} is not valid JSON`);
      }
    }
    const ids = new Set<string>();
    events.forEach((event, index) => {
      if (event.revision !== index) errors.push(`ledger revision gap at line ${index + 1}: expected ${index}, got ${event.revision}`);
      if (!event.id || ids.has(event.id)) errors.push(`ledger event id is missing or duplicated at line ${index + 1}`);
      ids.add(event.id);
    });
    if (events.length === 0) errors.push("ledger has no initialization event");
    return {
      ok: errors.length === 0,
      eventCount: events.length,
      lastRevision: events.at(-1)?.revision ?? null,
      errors,
    };
  }

  private async readLastLedgerRevision(): Promise<number | null> {
    const raw = await readFile(this.eventsPath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return null;
    const event = JSON.parse(lines.at(-1)!) as LedgerEvent;
    return event.revision;
  }

  private async acquireLock(actor: string): Promise<HeldLock> {
    const token = makeId("lock");
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const handle = await open(this.lockPath, "wx", 0o600);
        await handle.writeFile(JSON.stringify({ actor, token, pid: process.pid, acquiredAt: new Date().toISOString() }));
        return { handle, token };
      } catch (error) {
        if (!isCode(error, "EEXIST")) throw error;
        const lockStat = await stat(this.lockPath).catch(() => null);
        if (lockStat && Date.now() - lockStat.mtimeMs > this.staleLockMs) {
          await unlink(this.lockPath).catch(() => undefined);
          continue;
        }
        if (attempt < 49) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          continue;
        }
        throw new StateLockedError(`State is locked by another writer: ${this.lockPath}`);
      }
    }
    throw new StateLockedError(`Unable to acquire state lock: ${this.lockPath}`);
  }

  private async releaseLock(lock: HeldLock): Promise<void> {
    await lock.handle.close().catch(() => undefined);
    const raw = await readFile(this.lockPath, "utf8").catch(() => "");
    let token: string | undefined;
    try {
      token = (JSON.parse(raw) as { token?: string }).token;
    } catch {
      token = undefined;
    }
    if (token === lock.token) await unlink(this.lockPath).catch(() => undefined);
  }

  private async hasJournal(): Promise<boolean> {
    return readFile(this.journalPath, "utf8").then(() => true, (error: unknown) => {
      if (isCode(error, "ENOENT")) return false;
      throw error;
    });
  }

  private async recoverJournalLocked(): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(this.journalPath, "utf8");
    } catch (error) {
      if (isCode(error, "ENOENT")) return;
      throw error;
    }

    const journal = JSON.parse(raw) as TransactionJournal;
    if (!Array.isArray(journal.state.interactions)) journal.state.interactions = [];
    if (!Array.isArray(journal.state.sourceErrors)) journal.state.sourceErrors = [];
    assertState(journal.state);
    if (!journal.event || journal.event.revision !== journal.state.revision) {
      throw new Error("Invalid transaction journal revision");
    }
    if (containsPotentialSecret(raw)) throw new Error("Refusing to recover a transaction journal containing a potential secret");

    const current = await this.readSnapshot();
    const ledgerRevision = await this.readLastLedgerRevision();
    const targetRevision = journal.state.revision;
    const currentLedgerRevision = ledgerRevision ?? -1;

    if (current.revision > targetRevision || currentLedgerRevision > targetRevision) {
      throw new Error("Transaction journal is older than durable state");
    }
    if (current.revision < targetRevision - 1 || currentLedgerRevision < targetRevision - 1) {
      throw new Error("Transaction journal cannot bridge the durable revision gap");
    }
    if (current.revision === targetRevision) {
      const durable = JSON.stringify(current);
      const expected = JSON.stringify(journal.state);
      if (durable !== expected) throw new Error("Transaction journal conflicts with the durable snapshot");
    } else {
      await this.writeAtomic(this.snapshotPath, `${JSON.stringify(journal.state, null, 2)}\n`);
    }

    if (currentLedgerRevision === targetRevision) {
      const event = await this.readLastLedgerEvent();
      if (event?.id !== journal.event.id) throw new Error("Transaction journal conflicts with the durable ledger");
    } else {
      await appendFile(this.eventsPath, `${JSON.stringify(journal.event)}\n`, "utf8");
    }
    await unlink(this.journalPath);
  }

  private async readLastLedgerEvent(): Promise<LedgerEvent | null> {
    const raw = await readFile(this.eventsPath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines.at(-1)!) as LedgerEvent;
  }

  private async writeAtomic(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  }
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
