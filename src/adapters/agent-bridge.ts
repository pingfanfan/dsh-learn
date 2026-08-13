import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { containsPotentialSecret } from "../risk.ts";
import type { Channel, ChannelCapability, Interaction, InteractionKind, PublishJob, ReconcileResult } from "../types.ts";
import type { ChannelAdapter, ChannelConfig, PublishAttempt } from "./types.ts";

export class AgentBridgeAdapter implements ChannelAdapter {
  readonly id: Exclude<Channel, "local">;
  private readonly root: string;
  private readonly config: ChannelConfig;

  constructor(
    id: Exclude<Channel, "local">,
    root: string,
    config: ChannelConfig,
  ) {
    this.id = id;
    this.root = root;
    this.config = config;
  }

  async probe(): Promise<ChannelCapability> {
    return {
      channel: this.id,
      available: this.config.enabled && this.config.mode === "DRAFT_ONLY",
      mode: this.config.mode,
      reason: this.config.reason,
    };
  }

  async publish(job: PublishJob, content: string): Promise<PublishAttempt> {
    const capability = await this.probe();
    if (!capability.available) return { kind: "blocked", reason: capability.reason ?? `${this.id} 未授权` };
    return this.writeOutbox("publish", job, content);
  }

  async reconcile(_job: PublishJob): Promise<ReconcileResult> {
    return {
      state: "UNKNOWN",
      reason: "Agent bridge 需要宿主读取远端渠道后用 receipt 命令协调，禁止盲目重发。",
    };
  }

  async correct(job: PublishJob, content: string): Promise<PublishAttempt> {
    const capability = await this.probe();
    if (!capability.available) return { kind: "blocked", reason: capability.reason ?? `${this.id} 未授权` };
    return this.writeOutbox("correct", job, content);
  }

  async fetchInteractions(job: PublishJob): Promise<Interaction[]> {
    const path = join(this.root, "state", "private", "interactions", this.id, `${job.id}.json`);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch (error) {
      if (isMissingFile(error)) return [];
      throw error;
    }
    if (containsPotentialSecret(raw)) throw new Error(`Interaction bridge file for ${job.id} contains a potential secret`);
    const envelope = parseInteractionEnvelope(JSON.parse(raw), job, this.id);
    return envelope.interactions.map((item, index) => ({
      id: `bridge-${job.id}-${index}`,
      channel: this.id,
      remoteId: item.remoteId,
      kind: item.kind,
      ...(item.body === undefined ? {} : { body: item.body }),
      observedAt: item.observedAt,
    }));
  }

  private async writeOutbox(action: "publish" | "correct", job: PublishJob, content: string): Promise<PublishAttempt> {
    if (containsPotentialSecret(content)) return { kind: "blocked", reason: "内容疑似包含凭据" };
    const directory = join(this.root, "outbox", this.id);
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${job.dedupeKey}.json`);
    const payload = {
      schemaVersion: 1,
      action,
      channel: this.id,
      jobId: job.id,
      dedupeKey: job.dedupeKey,
      content,
      createdAt: new Date().toISOString(),
      note: "OUTBOX 不是发布回执；渠道 Agent 成功后必须记录 remoteId、url 和 publishedAt。",
    };
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return { kind: "outbox", path };
  }
}

interface InteractionBridgeItem {
  remoteId: string;
  kind: InteractionKind;
  observedAt: string;
  body?: string;
}

interface InteractionBridgeEnvelope {
  schemaVersion: 1;
  jobId: string;
  channel: Exclude<Channel, "local">;
  interactions: InteractionBridgeItem[];
}

function parseInteractionEnvelope(value: unknown, job: PublishJob, channel: Exclude<Channel, "local">): InteractionBridgeEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Interaction bridge file for ${job.id} must contain an object`);
  }
  const object = value as Record<string, unknown>;
  const allowed = new Set(["schemaVersion", "jobId", "channel", "interactions"]);
  const unknown = Object.keys(object).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`Interaction bridge file for ${job.id} contains unknown fields: ${unknown.join(", ")}`);
  if (object.schemaVersion !== 1) throw new Error(`Interaction bridge file for ${job.id} has an unsupported schemaVersion`);
  if (object.jobId !== job.id) throw new Error(`Interaction bridge file jobId does not match ${job.id}`);
  if (object.channel !== channel) throw new Error(`Interaction bridge file channel does not match ${channel}`);
  if (!Array.isArray(object.interactions)) throw new Error(`Interaction bridge file for ${job.id} must contain interactions[]`);
  const interactions = object.interactions.map((candidate, index) => parseInteractionItem(candidate, job.id, index));
  return { schemaVersion: 1, jobId: job.id, channel, interactions };
}

function parseInteractionItem(value: unknown, jobId: string, index: number): InteractionBridgeItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Interaction bridge item ${jobId}[${index}] must be an object`);
  }
  const object = value as Record<string, unknown>;
  const allowed = new Set(["remoteId", "kind", "observedAt", "body"]);
  const unknown = Object.keys(object).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`Interaction bridge item ${jobId}[${index}] contains unknown fields: ${unknown.join(", ")}`);
  if (typeof object.remoteId !== "string" || !object.remoteId.trim()) {
    throw new Error(`Interaction bridge item ${jobId}[${index}] remoteId must be a non-empty string`);
  }
  if (typeof object.kind !== "string" || !["comment", "mention", "citation", "reaction"].includes(object.kind)) {
    throw new Error(`Interaction bridge item ${jobId}[${index}] kind is invalid`);
  }
  if (typeof object.observedAt !== "string" || Number.isNaN(Date.parse(object.observedAt))) {
    throw new Error(`Interaction bridge item ${jobId}[${index}] observedAt is invalid`);
  }
  if (object.body !== undefined && typeof object.body !== "string") {
    throw new Error(`Interaction bridge item ${jobId}[${index}] body must be a string`);
  }
  return {
    remoteId: object.remoteId.trim(),
    kind: object.kind as InteractionKind,
    observedAt: new Date(object.observedAt).toISOString(),
    ...(object.body === undefined ? {} : { body: object.body }),
  };
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
