import type { ChannelCapability, Interaction, PublishJob, PublishReceipt, ReconcileResult } from "../types.ts";

export type PublishAttempt =
  | { kind: "published"; receipt: PublishReceipt }
  | { kind: "outbox"; path: string }
  | { kind: "blocked"; reason: string };

export interface ChannelAdapter {
  readonly id: PublishJob["channel"];
  probe(): Promise<ChannelCapability>;
  publish(job: PublishJob, content: string): Promise<PublishAttempt>;
  reconcile(job: PublishJob): Promise<ReconcileResult>;
  correct(job: PublishJob, content: string): Promise<PublishAttempt>;
  fetchInteractions(job: PublishJob): Promise<Interaction[]>;
}

export interface ChannelConfig {
  enabled: boolean;
  mode: "DRAFT_ONLY" | "UNAVAILABLE" | "DISABLED";
  reason?: string;
}
