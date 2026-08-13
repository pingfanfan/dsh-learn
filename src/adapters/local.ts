import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChannelCapability, Interaction, PublishJob, ReconcileResult } from "../types.ts";
import type { ChannelAdapter, PublishAttempt } from "./types.ts";

export class LocalAdapter implements ChannelAdapter {
  readonly id = "local" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async probe(): Promise<ChannelCapability> {
    return { channel: this.id, available: true, mode: "MOCK", reason: "仅用于测试，不能代表公开发布" };
  }

  async publish(job: PublishJob, content: string): Promise<PublishAttempt> {
    const directory = join(this.root, "outbox", "local");
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${job.dedupeKey}.md`);
    await writeFile(path, content, { encoding: "utf8", flag: "wx", mode: 0o600 }).catch((error: unknown) => {
      if (!isCode(error, "EEXIST")) throw error;
    });
    return {
      kind: "published",
      receipt: {
        remoteId: `local:${job.dedupeKey}`,
        url: `file:///outbox/local/${job.dedupeKey}.md`,
        publishedAt: new Date().toISOString(),
      },
    };
  }

  async reconcile(job: PublishJob): Promise<ReconcileResult> {
    if (!job.remoteId || !job.url || !job.publishedAt) return { state: "NOT_FOUND" };
    return {
      state: "FOUND",
      receipt: { remoteId: job.remoteId, url: job.url, publishedAt: job.publishedAt },
    };
  }

  async correct(job: PublishJob, content: string): Promise<PublishAttempt> {
    const directory = join(this.root, "outbox", "local");
    await mkdir(directory, { recursive: true });
    const originalKey = job.remoteId?.startsWith("local:") ? job.remoteId.slice("local:".length) : undefined;
    if (!originalKey || !/^[a-f0-9]{64}$/.test(originalKey)) {
      return { kind: "blocked", reason: "本地更正缺少可验证的原始 remoteId" };
    }
    const path = join(directory, `${originalKey}.md`);
    await writeFile(path, content, { encoding: "utf8", mode: 0o600 });
    return {
      kind: "published",
      receipt: {
        remoteId: job.remoteId ?? `local:${job.dedupeKey}`,
        url: job.url ?? `file:///outbox/local/${job.dedupeKey}.md`,
        publishedAt: job.publishedAt ?? new Date().toISOString(),
      },
    };
  }

  async fetchInteractions(_job: PublishJob): Promise<Interaction[]> {
    return [];
  }
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
