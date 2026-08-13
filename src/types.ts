export type OpportunityStatus =
  | "DISCOVERED"
  | "TRIAGED"
  | "CLAIMED"
  | "VERIFIED"
  | "BUILDING"
  | "READY"
  | "RELEASED"
  | "ARCHIVED"
  | "BLOCKED_RISK"
  | "DUPLICATE";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type WorkLane = "DUAL_TRACK" | "CANONICAL" | "BACKLOG" | "INELIGIBLE";
export type Channel = "github" | "weibo" | "zhihu" | "wechat" | "x" | "local";

export interface ScoreSignals {
  userImpact: number;
  freshness: number;
  compounding: number;
  ecosystemValue: number;
  evidenceConfidence: number;
  executability: number;
  duplicatePenalty?: number;
  riskPenalty?: number;
  maintenancePenalty?: number;
}

export interface ScoreResult {
  eligible: boolean;
  score: number;
  lane: WorkLane;
  reasons: string[];
}

export interface Lease {
  owner: string;
  token: string;
  aggregateRevision: number;
  acquiredAt: string;
  expiresAt: string;
  attempt: number;
}

export interface Opportunity {
  id: string;
  fingerprint: string;
  title: string;
  summary: string;
  sourceType: "official" | "ecosystem" | "community" | "feedback" | "maintenance";
  sourceUrl?: string;
  observedAt: string;
  directDshAction: boolean;
  audience: string[];
  proposedAssets: string[];
  signals: ScoreSignals;
  score: number;
  lane: WorkLane;
  status: OpportunityStatus;
  risk: RiskLevel;
  owner?: string;
  lease?: Lease;
  evidenceIds: string[];
  assetIds: string[];
  failureCount: number;
  lastError?: string;
  feedback?: {
    sampleCount: number;
    shortTermScore: number;
    longTermScore: number;
    adjustment: number;
    analyzedAt: string;
  };
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceKind = "OFFICIAL_SOURCE" | "LOCAL_REPRODUCTION" | "MULTI_SOURCE" | "UNVERIFIED";
export type EvidenceStatus = "UNVERIFIED" | "VERIFIED" | "STALE" | "REJECTED";

export interface EvidenceSource {
  url: string;
  title: string;
  kind: "official" | "repository" | "paper" | "community";
  publishedAt?: string;
  accessedAt: string;
}

export interface EvidencePack {
  id: string;
  opportunityId: string;
  claim: string;
  kind: EvidenceKind;
  status: EvidenceStatus;
  revision: number;
  sources: EvidenceSource[];
  baseline: {
    repository?: string;
    commit?: string;
    package?: string;
    version?: string;
  };
  reproduction?: {
    environment: string;
    commands: string[];
    result: "PASS" | "FAIL" | "NOT_RUN";
    notes: string;
  };
  confidence: number;
  verifiedAt: string;
  verifiedBy: string;
}

export type AssetStatus = "DRAFT" | "VERIFIED" | "READY" | "PUBLISHED" | "STALE" | "RETIRED";

export interface AssetValidation {
  kind: "content-review" | "validator" | "test" | "reproduction";
  result: "PASS";
  command?: string;
  notes: string;
  contentHash: string;
  checkedAt: string;
  checkedBy: string;
}

export interface Asset {
  id: string;
  opportunityId: string;
  type: "flash" | "tutorial" | "faq" | "lab" | "tool" | "plugin" | "upstream-report";
  title: string;
  canonicalPath: string;
  revision: number;
  contentHash: string;
  evidenceIds: string[];
  sourceRefs: Array<{ id: string; version?: string; commit?: string }>;
  verification: "UNVERIFIED" | "PASS" | "FAIL";
  validation?: AssetValidation;
  status: AssetStatus;
  staleSourceRevision?: string;
  stalePriorStatus?: "DRAFT" | "VERIFIED" | "READY" | "PUBLISHED";
  channelJobIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type PublishJobStatus =
  | "QUEUED"
  | "SENDING"
  | "OUTBOX"
  | "BLOCKED_CHANNEL"
  | "BLOCKED_RISK"
  | "SUCCEEDED"
  | "RETRYABLE_FAILED"
  | "UNKNOWN_REMOTE_STATE"
  | "CANCELLED";

export interface PublishJob {
  id: string;
  assetId: string;
  opportunityId: string;
  channel: Channel;
  variantPath: string;
  dedupeKey: string;
  assetRevision: number;
  contentHash: string;
  evidenceBindings: Array<{ id: string; revision: number }>;
  status: PublishJobStatus;
  risk: RiskLevel;
  remoteId?: string;
  url?: string;
  publishedAt?: string;
  userApproval?: {
    approvedAt: string;
    approvedBy: string;
    note?: string;
  };
  correctionOf?: string;
  blockedReason?: string;
  attempts: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface MetricSample {
  id: string;
  assetId: string;
  channel: Channel;
  capturedAt: string;
  values: Record<string, number>;
}

export interface SourceCursor {
  id: string;
  label: string;
  kind: "github-head" | "npm-latest" | "content-hash";
  url: string;
  sourceId: string;
  revision: string;
  firstObservedAt: string;
  lastCheckedAt: string;
  changedAt?: string;
}

export interface SourceError {
  id: string;
  error: string;
  observedAt: string;
}

export type InteractionKind = "comment" | "mention" | "citation" | "reaction";

export interface Interaction {
  id: string;
  assetId?: string;
  jobId?: string;
  channel: Channel;
  remoteId: string;
  kind: InteractionKind;
  body?: string;
  observedAt: string;
}

export interface StateSnapshot {
  schemaVersion: 1;
  revision: number;
  opportunities: Opportunity[];
  evidence: EvidencePack[];
  assets: Asset[];
  publishJobs: PublishJob[];
  metrics: MetricSample[];
  interactions: Interaction[];
  sourceCursors: SourceCursor[];
  sourceErrors: SourceError[];
  maintenanceCursor: number;
  updatedAt: string;
}

export interface LedgerEvent {
  id: string;
  at: string;
  actor: string;
  type: string;
  revision: number;
  entityType?: "opportunity" | "evidence" | "asset" | "publish-job" | "system";
  entityId?: string;
  details?: Record<string, unknown>;
}

export interface ChannelCapability {
  channel: Channel;
  available: boolean;
  mode: "REAL" | "DRAFT_ONLY" | "MOCK" | "UNAVAILABLE" | "DEGRADED" | "DISABLED";
  approvalRequired?: boolean;
  reason?: string;
}

export interface PublishReceipt {
  remoteId: string;
  url: string;
  publishedAt: string;
}

export interface ReconcileResult {
  state: "FOUND" | "NOT_FOUND" | "UNKNOWN";
  receipt?: PublishReceipt;
  reason?: string;
}
