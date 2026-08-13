import type { StateSnapshot } from "./types.ts";

const OPPORTUNITY_STATUSES = new Set([
  "DISCOVERED", "TRIAGED", "CLAIMED", "VERIFIED", "BUILDING", "READY", "RELEASED",
  "ARCHIVED", "BLOCKED_RISK", "DUPLICATE",
]);
const ACTIVE_LEASE_STATUSES = new Set(["CLAIMED", "VERIFIED", "BUILDING"]);
const EVIDENCE_STATUSES = new Set(["UNVERIFIED", "VERIFIED", "STALE", "REJECTED"]);
const EVIDENCE_KINDS = new Set(["OFFICIAL_SOURCE", "LOCAL_REPRODUCTION", "MULTI_SOURCE", "UNVERIFIED"]);
const ASSET_STATUSES = new Set(["DRAFT", "VERIFIED", "READY", "PUBLISHED", "STALE", "RETIRED"]);
const ASSET_TYPES = new Set(["flash", "tutorial", "faq", "lab", "tool", "plugin", "upstream-report"]);
const JOB_STATUSES = new Set([
  "QUEUED", "SENDING", "OUTBOX", "BLOCKED_CHANNEL", "BLOCKED_RISK", "SUCCEEDED",
  "RETRYABLE_FAILED", "UNKNOWN_REMOTE_STATE", "CANCELLED",
]);
const CHANNELS = new Set(["github", "weibo", "zhihu", "wechat", "x", "local"]);
const RISKS = new Set(["LOW", "MEDIUM", "HIGH"]);
const LANES = new Set(["DUAL_TRACK", "CANONICAL", "BACKLOG", "INELIGIBLE"]);

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label} id detected`);
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function assertInteger(value: unknown, label: string, minimum = 0): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < minimum) throw new Error(`${label} must be an integer >= ${minimum}`);
}

function assertDate(value: unknown, label: string): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error(`${label} must be a valid date`);
}

function assertEnum(value: unknown, values: Set<string>, label: string): void {
  if (typeof value !== "string" || !values.has(value)) throw new Error(`${label} is invalid`);
}

export function assertState(state: StateSnapshot): void {
  if (!state || typeof state !== "object") throw new Error("State must be an object");
  if (state.schemaVersion !== 1) throw new Error(`Unsupported schema version: ${state.schemaVersion}`);
  assertInteger(state.revision, "state revision");
  assertInteger(state.maintenanceCursor, "maintenance cursor");
  assertDate(state.updatedAt, "state updatedAt");
  assertArray(state.opportunities, "opportunities");
  assertArray(state.evidence, "evidence");
  assertArray(state.assets, "assets");
  assertArray(state.publishJobs, "publishJobs");
  assertArray(state.metrics, "metrics");
  assertArray(state.interactions, "interactions");
  assertArray(state.sourceCursors, "sourceCursors");
  assertArray(state.sourceErrors, "sourceErrors");

  assertUnique(state.opportunities.map((item) => item.id), "opportunity");
  assertUnique(state.opportunities.map((item) => item.fingerprint), "opportunity fingerprint");
  assertUnique(state.evidence.map((item) => item.id), "evidence");
  assertUnique(state.assets.map((item) => item.id), "asset");
  assertUnique(state.publishJobs.map((item) => item.id), "publish job");
  assertUnique(state.publishJobs.map((item) => item.dedupeKey), "publish dedupe key");
  assertUnique(state.metrics.map((item) => item.id), "metric");
  assertUnique(state.interactions.map((item) => item.id), "interaction");
  assertUnique(state.sourceCursors.map((item) => item.id), "source cursor");
  assertUnique(state.sourceErrors.map((item) => item.id), "source error");

  const opportunityIds = new Set(state.opportunities.map((item) => item.id));
  const evidenceIds = new Set(state.evidence.map((item) => item.id));
  const assetIds = new Set(state.assets.map((item) => item.id));
  const jobIds = new Set(state.publishJobs.map((item) => item.id));

  for (const opportunity of state.opportunities) {
    if (!opportunity.id || !opportunity.fingerprint || !opportunity.title.trim()) throw new Error("Opportunity identity is incomplete");
    assertEnum(opportunity.status, OPPORTUNITY_STATUSES, `Opportunity ${opportunity.id} status`);
    assertEnum(opportunity.lane, LANES, `Opportunity ${opportunity.id} lane`);
    assertEnum(opportunity.risk, RISKS, `Opportunity ${opportunity.id} risk`);
    assertInteger(opportunity.revision, `Opportunity ${opportunity.id} revision`, 1);
    assertInteger(opportunity.failureCount, `Opportunity ${opportunity.id} failureCount`);
    if (!Number.isFinite(opportunity.score) || opportunity.score < 0 || opportunity.score > 100) {
      throw new Error(`Opportunity ${opportunity.id} score is invalid`);
    }
    assertArray(opportunity.evidenceIds, `Opportunity ${opportunity.id} evidenceIds`);
    assertArray(opportunity.assetIds, `Opportunity ${opportunity.id} assetIds`);
    if (opportunity.lease) {
      if (!opportunity.owner || opportunity.owner !== opportunity.lease.owner) throw new Error(`Opportunity ${opportunity.id} lease owner mismatch`);
      if (!ACTIVE_LEASE_STATUSES.has(opportunity.status)) throw new Error(`Opportunity ${opportunity.id} has a lease in ${opportunity.status}`);
      if (!opportunity.lease.token || opportunity.lease.aggregateRevision !== opportunity.revision) {
        throw new Error(`Opportunity ${opportunity.id} lease fencing revision mismatch`);
      }
      assertDate(opportunity.lease.acquiredAt, `Opportunity ${opportunity.id} lease acquiredAt`);
      assertDate(opportunity.lease.expiresAt, `Opportunity ${opportunity.id} lease expiresAt`);
      assertInteger(opportunity.lease.attempt, `Opportunity ${opportunity.id} lease attempt`, 1);
    } else if (ACTIVE_LEASE_STATUSES.has(opportunity.status) || opportunity.owner) {
      throw new Error(`Opportunity ${opportunity.id} active status is missing a lease`);
    }
  }

  for (const evidence of state.evidence) {
    if (!opportunityIds.has(evidence.opportunityId)) throw new Error(`Orphan evidence: ${evidence.id}`);
    assertEnum(evidence.status, EVIDENCE_STATUSES, `Evidence ${evidence.id} status`);
    assertEnum(evidence.kind, EVIDENCE_KINDS, `Evidence ${evidence.id} kind`);
    assertInteger(evidence.revision, `Evidence ${evidence.id} revision`, 1);
    if (!Number.isFinite(evidence.confidence) || evidence.confidence < 0 || evidence.confidence > 100) {
      throw new Error(`Evidence ${evidence.id} confidence is invalid`);
    }
    assertArray(evidence.sources, `Evidence ${evidence.id} sources`);
    assertDate(evidence.verifiedAt, `Evidence ${evidence.id} verifiedAt`);
  }

  for (const asset of state.assets) {
    if (!opportunityIds.has(asset.opportunityId)) throw new Error(`Orphan asset: ${asset.id}`);
    assertEnum(asset.status, ASSET_STATUSES, `Asset ${asset.id} status`);
    assertEnum(asset.type, ASSET_TYPES, `Asset ${asset.id} type`);
    assertInteger(asset.revision, `Asset ${asset.id} revision`, 1);
    if (!/^[a-f0-9]{64}$/.test(asset.contentHash)) throw new Error(`Asset ${asset.id} content hash is invalid`);
    if (!asset.canonicalPath || asset.canonicalPath.startsWith("/") || asset.canonicalPath.split("/").includes("..")) {
      throw new Error(`Asset ${asset.id} canonical path is invalid`);
    }
    assertArray(asset.evidenceIds, `Asset ${asset.id} evidenceIds`);
    assertArray(asset.channelJobIds, `Asset ${asset.id} channelJobIds`);
    for (const evidenceId of asset.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) throw new Error(`Asset ${asset.id} references missing evidence ${evidenceId}`);
    }
    for (const jobId of asset.channelJobIds) {
      if (!jobIds.has(jobId)) throw new Error(`Asset ${asset.id} references missing publish job ${jobId}`);
    }
    if (["READY", "PUBLISHED"].includes(asset.status) && asset.verification !== "PASS") {
      throw new Error(`Ready asset ${asset.id} is missing a passing validation`);
    }
    if (asset.verification === "PASS") {
      if (!asset.validation || asset.validation.result !== "PASS") throw new Error(`Asset ${asset.id} has PASS without a validation receipt`);
      if (asset.validation.contentHash !== asset.contentHash) throw new Error(`Asset ${asset.id} validation is bound to a different content hash`);
      if (!asset.validation.notes.trim()) throw new Error(`Asset ${asset.id} validation notes are empty`);
      assertDate(asset.validation.checkedAt, `Asset ${asset.id} validation checkedAt`);
    }
  }

  for (const job of state.publishJobs) {
    const asset = state.assets.find((item) => item.id === job.assetId);
    if (!asset) throw new Error(`Publish job ${job.id} references missing asset ${job.assetId}`);
    if (!opportunityIds.has(job.opportunityId)) throw new Error(`Publish job ${job.id} references missing opportunity`);
    if (asset.opportunityId !== job.opportunityId) throw new Error(`Publish job ${job.id} crosses opportunity aggregates`);
    if (!asset.channelJobIds.includes(job.id)) throw new Error(`Publish job ${job.id} is missing from its asset index`);
    assertEnum(job.status, JOB_STATUSES, `Publish job ${job.id} status`);
    assertEnum(job.channel, CHANNELS, `Publish job ${job.id} channel`);
    assertEnum(job.risk, RISKS, `Publish job ${job.id} risk`);
    assertInteger(job.revision, `Publish job ${job.id} revision`, 1);
    assertInteger(job.assetRevision, `Publish job ${job.id} assetRevision`, 1);
    assertInteger(job.attempts, `Publish job ${job.id} attempts`);
    assertArray(job.evidenceBindings, `Publish job ${job.id} evidenceBindings`);
    if (job.status === "SUCCEEDED") {
      if (!job.remoteId || !job.url || !job.publishedAt) throw new Error(`Succeeded job ${job.id} is missing a real receipt`);
      assertDate(job.publishedAt, `Publish job ${job.id} publishedAt`);
    }
    if (job.userApproval) {
      if (!job.userApproval.approvedBy?.trim()) throw new Error(`Publish job ${job.id} approval identity is empty`);
      assertDate(job.userApproval.approvedAt, `Publish job ${job.id} approvedAt`);
      if (job.userApproval.note !== undefined && typeof job.userApproval.note !== "string") {
        throw new Error(`Publish job ${job.id} approval note must be a string`);
      }
    }
    if (job.correctionOf) {
      const original = state.publishJobs.find((item) => item.id === job.correctionOf);
      if (!original || original.status !== "SUCCEEDED" || original.channel !== job.channel || original.assetId !== job.assetId) {
        throw new Error(`Correction job ${job.id} has an invalid original job`);
      }
    }
    if (["QUEUED", "SENDING", "OUTBOX"].includes(job.status)) {
      if (asset.revision !== job.assetRevision) throw new Error(`Publish job ${job.id} is bound to a stale asset revision`);
      for (const binding of job.evidenceBindings) {
        const evidence = state.evidence.find((item) => item.id === binding.id);
        if (!evidence || evidence.revision !== binding.revision || evidence.status !== "VERIFIED") {
          throw new Error(`Publish job ${job.id} is bound to stale or unverified evidence`);
        }
      }
    }
  }

  for (const metric of state.metrics) {
    if (!assetIds.has(metric.assetId)) throw new Error(`Metric ${metric.id} references missing asset`);
    assertEnum(metric.channel, CHANNELS, `Metric ${metric.id} channel`);
    assertDate(metric.capturedAt, `Metric ${metric.id} capturedAt`);
    for (const [key, value] of Object.entries(metric.values)) {
      if (!key || !Number.isFinite(value) || value < 0) throw new Error(`Metric ${metric.id} contains an invalid value`);
    }
  }

  for (const interaction of state.interactions) {
    if (!interaction.id || !interaction.remoteId.trim()) throw new Error("Interaction identity is incomplete");
    assertEnum(interaction.channel, CHANNELS, `Interaction ${interaction.id} channel`);
    assertEnum(interaction.kind, new Set(["comment", "mention", "citation", "reaction"]), `Interaction ${interaction.id} kind`);
    assertDate(interaction.observedAt, `Interaction ${interaction.id} observedAt`);
    if (interaction.body !== undefined && typeof interaction.body !== "string") {
      throw new Error(`Interaction ${interaction.id} body must be a string`);
    }
    if (!interaction.assetId || !assetIds.has(interaction.assetId)) {
      throw new Error(`Interaction ${interaction.id} references a missing asset`);
    }
    if (!interaction.jobId || !jobIds.has(interaction.jobId)) {
      throw new Error(`Interaction ${interaction.id} references a missing publish job`);
    }
    const job = state.publishJobs.find((item) => item.id === interaction.jobId);
    if (!job || job.assetId !== interaction.assetId || job.channel !== interaction.channel) {
      throw new Error(`Interaction ${interaction.id} crosses its publish job aggregate`);
    }
  }

  for (const cursor of state.sourceCursors) {
    if (!cursor.id || !cursor.sourceId || !cursor.revision) throw new Error("Source cursor identity is incomplete");
    assertEnum(cursor.kind, new Set(["github-head", "npm-latest", "content-hash"]), `Source cursor ${cursor.id} kind`);
    assertDate(cursor.firstObservedAt, `Source cursor ${cursor.id} firstObservedAt`);
    assertDate(cursor.lastCheckedAt, `Source cursor ${cursor.id} lastCheckedAt`);
  }

  for (const sourceError of state.sourceErrors) {
    if (!sourceError.id || !sourceError.error.trim()) throw new Error("Source error identity is incomplete");
    assertDate(sourceError.observedAt, `Source error ${sourceError.id} observedAt`);
  }
}
