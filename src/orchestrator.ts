import { access } from "node:fs/promises";
import { feedbackDecisions, type FeedbackDecision } from "./analytics.ts";
import { readPublicContent, resolvePublicReadableFile } from "./content.ts";
import { fingerprint, makeId } from "./id.ts";
import type { AssetValidationDraft, EvidenceDraft, OpportunityDraft } from "./input.ts";
import { assessRisk, containsPotentialSecret, redactSecrets } from "./risk.ts";
import { scoreOpportunity } from "./scoring.ts";
import { observeSources, readSourceAttestations } from "./source-watch.ts";
import { assertTransition } from "./state-machine.ts";
import { Store } from "./store.ts";
import { loadAdapters } from "./adapters/registry.ts";
import type { ChannelAdapter } from "./adapters/types.ts";
import type {
  Asset,
  AssetValidation,
  Channel,
  ChannelCapability,
  EvidencePack,
  Interaction,
  MetricSample,
  Opportunity,
  PublishJob,
  PublishReceipt,
  StateSnapshot,
} from "./types.ts";

const DEFAULT_LEASE_MS = 30 * 60 * 1000;
const ROUTINE_MAINTENANCE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_WORKERS = 4;
const MAX_PUBLISH_ATTEMPTS = 2;
const OPEN_JOB_STATES = new Set<PublishJob["status"]>(["QUEUED", "SENDING", "OUTBOX", "UNKNOWN_REMOTE_STATE"]);

export type AdapterLoader = (root: string) => Promise<Map<Channel, ChannelAdapter>>;

export class Orchestrator {
  readonly root: string;
  readonly store: Store;
  readonly adapterLoader: AdapterLoader;

  constructor(root: string, adapterLoader: AdapterLoader = loadAdapters) {
    this.root = root;
    this.store = new Store(root);
    this.adapterLoader = adapterLoader;
  }

  async init(actor = "orchestrator"): Promise<void> {
    await this.store.init(actor);
  }

  async scan(drafts: OpportunityDraft[], actor = "scout"): Promise<{ created: Opportunity[]; duplicates: string[] }> {
    return (await this.store.transact(actor, {
      type: "opportunities.scanned",
      entityType: "system",
      details: { inputCount: drafts.length },
    }, (state) => {
      const created: Opportunity[] = [];
      const duplicates: string[] = [];
      for (const draft of drafts) {
        const key = fingerprint([draft.sourceUrl ?? draft.sourceType, draft.title, draft.summary]);
        if (state.opportunities.some((item) => item.fingerprint === key)) {
          duplicates.push(key);
          continue;
        }
        const now = new Date().toISOString();
        const scored = scoreOpportunity(draft.signals, draft.directDshAction);
        const opportunity: Opportunity = {
          id: makeId("opp"),
          fingerprint: key,
          title: draft.title,
          summary: draft.summary,
          sourceType: draft.sourceType,
          sourceUrl: draft.sourceUrl,
          observedAt: draft.observedAt ?? now,
          directDshAction: draft.directDshAction,
          audience: draft.audience,
          proposedAssets: draft.proposedAssets,
          signals: draft.signals,
          score: scored.score,
          lane: scored.lane,
          status: scored.eligible ? "TRIAGED" : "ARCHIVED",
          risk: draft.risk ?? "LOW",
          evidenceIds: [],
          assetIds: [],
          failureCount: 0,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        };
        state.opportunities.push(opportunity);
        created.push(structuredClone(opportunity));
      }
      return { created, duplicates };
    })).result;
  }

  async next(limit = 10): Promise<Opportunity[]> {
    const state = await this.store.read();
    return sortCandidates(state.opportunities.filter((item) => item.status === "TRIAGED")).slice(0, limit);
  }

  async claimNext(worker: string, leaseMs = DEFAULT_LEASE_MS): Promise<Opportunity | null> {
    if (!worker.trim()) throw new Error("worker is required");
    return (await this.store.transact("orchestrator", {
      type: "opportunity.claimed",
      entityType: "opportunity",
      details: { worker },
    }, (state) => {
      reclaimExpiredLeases(state);
      const activeLeases = state.opportunities.filter((item) => item.lease);
      if (activeLeases.some((item) => item.lease?.owner === worker)) return null;
      if (activeLeases.length >= MAX_ACTIVE_WORKERS) return null;
      let opportunity: Opportunity | null = sortCandidates(state.opportunities.filter((item) => item.status === "TRIAGED"))[0] ?? null;
      if (!opportunity) opportunity = createMaintenanceOpportunity(state);
      if (!opportunity) return null;
      assertTransition(opportunity.status, "CLAIMED");
      const now = new Date();
      opportunity.status = "CLAIMED";
      opportunity.owner = worker;
      opportunity.revision += 1;
      opportunity.lease = {
        owner: worker,
        token: makeId("lease"),
        aggregateRevision: opportunity.revision,
        acquiredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
        attempt: opportunity.failureCount + 1,
      };
      opportunity.updatedAt = now.toISOString();
      return structuredClone(opportunity);
    })).result;
  }

  async verify(
    opportunityId: string,
    worker: string,
    leaseToken: string,
    aggregateRevision: number,
    draft: EvidenceDraft,
  ): Promise<{ opportunity: Opportunity; evidence: EvidencePack }> {
    ensureEvidenceQuality(draft);
    return (await this.store.transact(worker, {
      type: "evidence.verified",
      entityType: "opportunity",
      entityId: opportunityId,
    }, (state) => {
      const opportunity = requireOpportunity(state, opportunityId);
      assertLease(opportunity, worker, leaseToken, aggregateRevision);
      assertTransition(opportunity.status, "VERIFIED");
      const now = new Date().toISOString();
      const evidence: EvidencePack = {
        id: makeId("evd"),
        opportunityId,
        claim: draft.claim,
        kind: draft.kind,
        status: "VERIFIED",
        revision: 1,
        sources: draft.sources,
        baseline: draft.baseline ?? {},
        reproduction: draft.reproduction,
        confidence: draft.confidence,
        verifiedAt: now,
        verifiedBy: worker,
      };
      state.evidence.push(evidence);
      opportunity.evidenceIds.push(evidence.id);
      opportunity.status = "VERIFIED";
      bumpLeasedOpportunity(opportunity);
      return { opportunity: structuredClone(opportunity), evidence: structuredClone(evidence) };
    })).result;
  }

  async augmentEvidence(evidenceId: string, draft: EvidenceDraft, actor = "research-verify"): Promise<EvidencePack> {
    ensureEvidenceQuality(draft);
    return (await this.store.transact(actor, {
      type: "evidence.augmented",
      entityType: "evidence",
      entityId: evidenceId,
    }, (state) => {
      const evidence = requireEvidence(state, evidenceId);
      if (draft.claim !== evidence.claim) throw new Error("Evidence augmentation cannot change the claim");
      const baselineChanged = JSON.stringify(draft.baseline ?? {}) !== JSON.stringify(evidence.baseline);
      if (evidence.status !== "STALE" && baselineChanged) {
        throw new Error("Evidence augmentation cannot change the baseline");
      }
      if (evidence.status === "STALE" && !baselineChanged) {
        throw new Error("Stale evidence must be reverified against an updated baseline");
      }
      const newSources = new Set(draft.sources.map((source) => source.url));
      if (evidence.sources.some((source) => !newSources.has(source.url))) {
        throw new Error("Evidence augmentation cannot remove existing sources");
      }
      if (draft.confidence < evidence.confidence) throw new Error("Evidence augmentation cannot lower confidence");
      if (evidence.reproduction?.result === "PASS" && draft.reproduction?.result !== "PASS") {
        throw new Error("Evidence augmentation cannot remove a passing reproduction");
      }
      evidence.kind = draft.kind;
      evidence.sources = draft.sources;
      if (evidence.status === "STALE") evidence.baseline = draft.baseline ?? {};
      evidence.reproduction = draft.reproduction;
      evidence.confidence = draft.confidence;
      evidence.status = "VERIFIED";
      evidence.revision += 1;
      evidence.verifiedAt = new Date().toISOString();
      evidence.verifiedBy = actor;
      const assetIds = new Set(state.assets.filter((asset) => asset.evidenceIds.includes(evidence.id)).map((asset) => asset.id));
      for (const asset of state.assets.filter((item) => assetIds.has(item.id))) {
        asset.sourceRefs = sourceRefsForAsset(state, asset);
        asset.updatedAt = evidence.verifiedAt;
      }
      for (const job of state.publishJobs.filter((item) => assetIds.has(item.assetId))) {
        if (["SUCCEEDED", "CANCELLED"].includes(job.status)) continue;
        invalidatePublishJob(job, "证据包已增强，需要绑定新 revision 后重新排队", evidence.verifiedAt);
      }
      return structuredClone(evidence);
    })).result;
  }

  async registerAsset(input: {
    opportunityId: string;
    worker: string;
    leaseToken: string;
    aggregateRevision: number;
    type: Asset["type"];
    title: string;
    canonicalPath: string;
  }): Promise<{ opportunity: Opportunity; asset: Asset }> {
    const file = await readPublicContent(this.root, input.canonicalPath);
    const canonicalPath = file.relativePath;
    return (await this.store.transact(input.worker, {
      type: "asset.registered",
      entityType: "opportunity",
      entityId: input.opportunityId,
    }, (state) => {
      const opportunity = requireOpportunity(state, input.opportunityId);
      assertLease(opportunity, input.worker, input.leaseToken, input.aggregateRevision);
      assertTransition(opportunity.status, "BUILDING");
      const evidence = opportunity.evidenceIds.map((id) => requireEvidence(state, id));
      if (evidence.length === 0 || evidence.some((item) => item.status !== "VERIFIED")) {
        throw new Error("Asset requires verified evidence");
      }
      const now = new Date().toISOString();
      const asset: Asset = {
        id: makeId("ast"),
        opportunityId: opportunity.id,
        type: input.type,
        title: input.title.trim(),
        canonicalPath,
        revision: 1,
        contentHash: file.hash,
        evidenceIds: evidence.map((item) => item.id),
        sourceRefs: evidence.flatMap(sourceRefsForEvidence),
        verification: "UNVERIFIED",
        status: "DRAFT",
        channelJobIds: [],
        createdAt: now,
        updatedAt: now,
      };
      state.assets.push(asset);
      opportunity.assetIds.push(asset.id);
      opportunity.status = "BUILDING";
      bumpLeasedOpportunity(opportunity);
      return { opportunity: structuredClone(opportunity), asset: structuredClone(asset) };
    })).result;
  }

  async readyAsset(input: {
    assetId: string;
    worker: string;
    leaseToken: string;
    aggregateRevision: number;
    validation: AssetValidationDraft;
  }): Promise<{ opportunity: Opportunity; asset: Asset }> {
    const initial = await this.store.read();
    const initialAsset = requireAsset(initial, input.assetId);
    const file = await readPublicContent(this.root, initialAsset.canonicalPath);
    ensureAssetValidation(input.validation, initialAsset.type);
    return (await this.store.transact(input.worker, {
      type: "asset.ready",
      entityType: "asset",
      entityId: input.assetId,
    }, (state) => {
      const asset = requireAsset(state, input.assetId);
      const opportunity = requireOpportunity(state, asset.opportunityId);
      assertLease(opportunity, input.worker, input.leaseToken, input.aggregateRevision);
      if (asset.status !== "DRAFT" && asset.status !== "VERIFIED") throw new Error(`Asset is not editable: ${asset.status}`);
      if (asset.contentHash !== file.hash) {
        asset.revision += 1;
        asset.contentHash = file.hash;
      }
      asset.verification = "PASS";
      asset.validation = materializeAssetValidation(input.validation, file.hash, input.worker);
      asset.status = "READY";
      asset.staleSourceRevision = undefined;
      asset.updatedAt = new Date().toISOString();
      assertTransition(opportunity.status, "READY");
      opportunity.status = "READY";
      opportunity.revision += 1;
      opportunity.owner = undefined;
      opportunity.lease = undefined;
      opportunity.updatedAt = asset.updatedAt;
      return { opportunity: structuredClone(opportunity), asset: structuredClone(asset) };
    })).result;
  }

  async reviseAsset(
    assetId: string,
    validation: AssetValidationDraft,
    canonicalPath?: string,
    actor = "content-publish",
  ): Promise<{ changed: boolean; asset: Asset }> {
    const before = await this.store.read();
    const beforeAsset = requireAsset(before, assetId);
    const path = canonicalPath ?? beforeAsset.canonicalPath;
    const file = await readPublicContent(this.root, path);
    ensureAssetValidation(validation, beforeAsset.type);
    const normalizedPath = file.relativePath;
    const beforeEvidence = beforeAsset.evidenceIds.map((id) => requireEvidence(before, id));
    const revalidating = beforeAsset.status === "STALE" && beforeEvidence.every((item) => item.status === "VERIFIED");
    if (beforeAsset.contentHash === file.hash && beforeAsset.canonicalPath === normalizedPath && !revalidating) {
      return { changed: false, asset: structuredClone(beforeAsset) };
    }
    return (await this.store.transact(actor, {
      type: "asset.revised",
      entityType: "asset",
      entityId: assetId,
    }, (state) => {
      const asset = requireAsset(state, assetId);
      if (asset.revision !== beforeAsset.revision) throw new Error("Asset changed while revision was being prepared");
      const evidence = asset.evidenceIds.map((id) => requireEvidence(state, id));
      if (evidence.some((item) => item.status !== "VERIFIED")) throw new Error("Cannot revise an asset with stale evidence");
      const sameContent = beforeAsset.contentHash === file.hash && beforeAsset.canonicalPath === normalizedPath;
      if (sameContent && revalidating) {
        asset.sourceRefs = sourceRefsForAsset(state, asset);
        asset.verification = "PASS";
        asset.validation = materializeAssetValidation(validation, file.hash, actor);
        asset.status = asset.stalePriorStatus ?? "READY";
        asset.staleSourceRevision = undefined;
        asset.stalePriorStatus = undefined;
        asset.updatedAt = new Date().toISOString();
        closeMaintenanceForAsset(state, asset.id, asset.updatedAt);
        return { changed: true, asset: structuredClone(asset) };
      }
      for (const job of state.publishJobs.filter((item) => item.assetId === asset.id)) {
        if (["SUCCEEDED", "CANCELLED"].includes(job.status)) continue;
        invalidatePublishJob(job, "规范资产已修订，需要基于新 revision 重新排队");
      }
      asset.canonicalPath = normalizedPath;
      asset.contentHash = file.hash;
      asset.sourceRefs = sourceRefsForAsset(state, asset);
      asset.revision += 1;
      asset.verification = "PASS";
      asset.validation = materializeAssetValidation(validation, file.hash, actor);
      asset.status = "READY";
      asset.staleSourceRevision = undefined;
      asset.stalePriorStatus = undefined;
      asset.updatedAt = new Date().toISOString();
      closeMaintenanceForAsset(state, asset.id, asset.updatedAt);
      return { changed: true, asset: structuredClone(asset) };
    })).result;
  }

  async attestAsset(
    assetId: string,
    validation: AssetValidationDraft,
    actor = "research-verify",
  ): Promise<Asset> {
    const before = await this.store.read();
    const beforeAsset = requireAsset(before, assetId);
    if (!["READY", "PUBLISHED"].includes(beforeAsset.status)) {
      throw new Error(`Only an already ready asset can be backfilled with validation: ${beforeAsset.status}`);
    }
    ensureAssetValidation(validation, beforeAsset.type);
    const file = await readPublicContent(this.root, beforeAsset.canonicalPath);
    return (await this.store.transact(actor, {
      type: "asset.validation-attested",
      entityType: "asset",
      entityId: assetId,
    }, (state) => {
      const asset = requireAsset(state, assetId);
      if (asset.revision !== beforeAsset.revision || asset.contentHash !== file.hash) {
        throw new Error("Asset changed while validation was being attested");
      }
      asset.verification = "PASS";
      asset.validation = materializeAssetValidation(validation, file.hash, actor);
      asset.updatedAt = new Date().toISOString();
      return structuredClone(asset);
    })).result;
  }

  async completeMaintenance(input: {
    opportunityId: string;
    worker: string;
    leaseToken: string;
    aggregateRevision: number;
    validation: AssetValidationDraft;
  }): Promise<{ opportunity: Opportunity; asset: Asset }> {
    const before = await this.store.read();
    const beforeOpportunity = requireOpportunity(before, input.opportunityId);
    if (beforeOpportunity.sourceType !== "maintenance" || beforeOpportunity.assetIds.length !== 1) {
      throw new Error("Maintenance completion requires a single-asset maintenance opportunity");
    }
    const beforeAsset = requireAsset(before, beforeOpportunity.assetIds[0]);
    if (!["READY", "PUBLISHED"].includes(beforeAsset.status)) {
      throw new Error(`Maintenance cannot complete an asset in ${beforeAsset.status}`);
    }
    const file = await readPublicContent(this.root, beforeAsset.canonicalPath);
    ensureAssetValidation(input.validation, beforeAsset.type);
    return (await this.store.transact(input.worker, {
      type: "maintenance.completed",
      entityType: "opportunity",
      entityId: input.opportunityId,
    }, (state) => {
      const opportunity = requireOpportunity(state, input.opportunityId);
      assertLease(opportunity, input.worker, input.leaseToken, input.aggregateRevision);
      const asset = requireAsset(state, beforeAsset.id);
      if (!["READY", "PUBLISHED"].includes(asset.status)) {
        throw new Error(`Maintenance asset changed to ${asset.status}`);
      }
      if (asset.contentHash !== file.hash) {
        throw new Error("Maintenance found content drift; use asset-revise instead");
      }
      const evidence = asset.evidenceIds.map((id) => requireEvidence(state, id));
      if (evidence.some((item) => item.status !== "VERIFIED")) {
        throw new Error("Maintenance evidence is stale; reverify the source before completing");
      }
      const now = new Date().toISOString();
      asset.verification = "PASS";
      asset.validation = materializeAssetValidation(input.validation, file.hash, input.worker);
      asset.staleSourceRevision = undefined;
      asset.stalePriorStatus = undefined;
      asset.updatedAt = now;
      assertTransition(opportunity.status, "ARCHIVED");
      opportunity.status = "ARCHIVED";
      opportunity.owner = undefined;
      opportunity.lease = undefined;
      opportunity.revision += 1;
      opportunity.updatedAt = now;
      return { opportunity: structuredClone(opportunity), asset: structuredClone(asset) };
    })).result;
  }

  async queuePublish(
    assetId: string,
    variants: Partial<Record<Channel, string>>,
    actor = "orchestrator",
  ): Promise<PublishJob[]> {
    const before = await this.store.read();
    const sourceAsset = requireAsset(before, assetId);
    const prepared = await Promise.all(Object.entries(variants).map(async ([channel, path]) => {
      const file = await readPublicContent(this.root, path!);
      return { channel: channel as Channel, path: file.relativePath, ...file };
    }));
    const adapters = await this.adapterLoader(this.root);
    const capabilities = new Map<Channel, ChannelCapability>();
    for (const item of prepared) {
      const adapter = adapters.get(item.channel);
      if (!adapter) throw new Error(`Unknown channel: ${item.channel}`);
      capabilities.set(item.channel, await adapter.probe());
    }
    return (await this.store.transact(actor, {
      type: "publish.queued",
      entityType: "asset",
      entityId: assetId,
      details: { channels: prepared.map((item) => item.channel) },
    }, (state) => {
      const asset = requireAsset(state, assetId);
      if (asset.revision !== sourceAsset.revision || !["READY", "PUBLISHED"].includes(asset.status) || asset.verification !== "PASS") {
        throw new Error("Asset changed or is not ready");
      }
      const opportunity = requireOpportunity(state, asset.opportunityId);
      if (!["READY", "RELEASED"].includes(opportunity.status)) throw new Error(`Opportunity is not ready: ${opportunity.status}`);
      const evidence = asset.evidenceIds.map((id) => requireEvidence(state, id));
      if (evidence.some((item) => item.status !== "VERIFIED")) throw new Error("Asset evidence is stale or unverified");
      const created: PublishJob[] = [];
      for (const item of prepared) {
        const dedupeKey = fingerprint([asset.id, String(asset.revision), item.channel, item.hash]);
        const existing = state.publishJobs.find((job) => job.dedupeKey === dedupeKey);
        if (existing && existing.status !== "CANCELLED") {
          created.push(structuredClone(existing));
          continue;
        }
        const uncertain = state.publishJobs.find((job) =>
          job.assetId === asset.id && job.channel === item.channel &&
          ["SENDING", "OUTBOX", "UNKNOWN_REMOTE_STATE"].includes(job.status)
        );
        if (uncertain) throw new Error(`Channel ${item.channel} has an uncertain publish job; reconcile it before queuing another version`);
        for (const previous of state.publishJobs.filter((job) =>
          job.assetId === asset.id && job.channel === item.channel &&
          !["SUCCEEDED", "CANCELLED", "SENDING", "UNKNOWN_REMOTE_STATE"].includes(job.status)
        )) {
          previous.status = "CANCELLED";
          previous.blockedReason = `被同一资产 revision ${asset.revision} 的更新渠道稿替代`;
          previous.revision += 1;
          previous.updatedAt = new Date().toISOString();
        }
        const risk = assessRisk("publish", item.content);
        const capability = capabilities.get(item.channel)!;
        const now = new Date().toISOString();
        const status = risk.requiresUser ? "BLOCKED_RISK" : capability.available ? "QUEUED" : "BLOCKED_CHANNEL";
        const blockedReason = risk.requiresUser ? risk.reasons.join("；") : capability.available ? undefined : capability.reason;
        if (existing) {
          existing.variantPath = item.path;
          existing.assetRevision = asset.revision;
          existing.contentHash = item.hash;
          existing.evidenceBindings = evidence.map((entry) => ({ id: entry.id, revision: entry.revision }));
          existing.status = status;
          existing.risk = risk.level;
          existing.blockedReason = blockedReason;
          existing.revision += 1;
          existing.updatedAt = now;
          created.push(structuredClone(existing));
          continue;
        }
        const job: PublishJob = {
          id: makeId("pub"),
          assetId: asset.id,
          opportunityId: opportunity.id,
          channel: item.channel,
          variantPath: item.path,
          dedupeKey,
          assetRevision: asset.revision,
          contentHash: item.hash,
          evidenceBindings: evidence.map((entry) => ({ id: entry.id, revision: entry.revision })),
          status,
          risk: risk.level,
          blockedReason,
          attempts: 0,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        };
        state.publishJobs.push(job);
        asset.channelJobIds.push(job.id);
        created.push(structuredClone(job));
      }
      asset.updatedAt = new Date().toISOString();
      return created;
    })).result;
  }

  async queueCorrection(
    originalJobId: string,
    variantPath: string,
    actor = "orchestrator",
  ): Promise<PublishJob> {
    const before = await this.store.read();
    const original = requireJob(before, originalJobId);
    if (original.status !== "SUCCEEDED" || !original.remoteId || !original.url || !original.publishedAt) {
      throw new Error("Correction requires an already published job with a real receipt");
    }
    const sourceAsset = requireAsset(before, original.assetId);
    if (!["READY", "PUBLISHED"].includes(sourceAsset.status)) throw new Error(`Asset cannot be corrected: ${sourceAsset.status}`);
    const file = await readPublicContent(this.root, variantPath);
    const path = file.relativePath;
    const adapters = await this.adapterLoader(this.root);
    const adapter = adapters.get(original.channel);
    if (!adapter) throw new Error(`Unknown channel: ${original.channel}`);
    const capability = await adapter.probe();
    const risk = assessRisk("correct", file.content);
    return (await this.store.transact(actor, {
      type: "correction.queued",
      entityType: "publish-job",
      entityId: originalJobId,
    }, (state) => {
      const asset = requireAsset(state, original.assetId);
      if (asset.revision !== sourceAsset.revision) throw new Error("Asset changed while correction was being prepared");
      const evidence = asset.evidenceIds.map((id) => requireEvidence(state, id));
      if (evidence.some((item) => item.status !== "VERIFIED")) throw new Error("Correction evidence is stale");
      const dedupeKey = fingerprint([asset.id, String(asset.revision), original.channel, file.hash, "correction", original.remoteId!]);
      const existing = state.publishJobs.find((job) => job.dedupeKey === dedupeKey);
      if (existing) return structuredClone(existing);
      const now = new Date().toISOString();
      const job: PublishJob = {
        id: makeId("pub"), assetId: asset.id, opportunityId: asset.opportunityId,
        channel: original.channel, variantPath: path, dedupeKey, assetRevision: asset.revision,
        contentHash: file.hash,
        evidenceBindings: evidence.map((entry) => ({ id: entry.id, revision: entry.revision })),
        status: risk.requiresUser ? "BLOCKED_RISK" : capability.available ? "QUEUED" : "BLOCKED_CHANNEL",
        risk: risk.level, correctionOf: original.id,
        remoteId: original.remoteId, url: original.url, publishedAt: original.publishedAt,
        blockedReason: risk.requiresUser ? risk.reasons.join("；") : capability.available ? undefined : capability.reason,
        attempts: 0, revision: 1, createdAt: now, updatedAt: now,
      };
      state.publishJobs.push(job);
      asset.channelJobIds.push(job.id);
      asset.updatedAt = now;
      return structuredClone(job);
    })).result;
  }

  async dispatch(jobId: string, allowMock = false): Promise<PublishJob> {
    const before = await this.store.read();
    const beforeJob = requireJob(before, jobId);
    if (beforeJob.status === "SENDING" || beforeJob.status === "UNKNOWN_REMOTE_STATE") {
      throw new Error("Publish state is uncertain; run reconcile before any retry");
    }
    if (beforeJob.status !== "QUEUED") throw new Error(`Publish job is not queued: ${beforeJob.status}`);
    if (beforeJob.attempts >= MAX_PUBLISH_ATTEMPTS) {
      throw new Error(`Publish job has reached the maximum of ${MAX_PUBLISH_ATTEMPTS} attempts; create a fresh job for the current asset revision`);
    }
    const file = await readPublicContent(this.root, beforeJob.variantPath);
    if (file.hash !== beforeJob.contentHash) throw new Error("Publish content changed after the job was prepared");
    const adapters = await this.adapterLoader(this.root);
    const adapter = adapters.get(beforeJob.channel);
    if (!adapter) throw new Error(`Unknown channel: ${beforeJob.channel}`);
    const capability = await adapter.probe();
    if (capability.approvalRequired && !beforeJob.userApproval) {
      throw new Error(`Channel ${beforeJob.channel} requires explicit user approval before dispatch`);
    }
    if (capability.mode === "MOCK" && !allowMock) throw new Error("Mock adapter requires explicit --allow-mock");

    const sending = (await this.store.transact("orchestrator", {
      type: "publish.sending",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      if (job.status !== "QUEUED") throw new Error(`Publish job changed: ${job.status}`);
      assertPublishBindings(state, job);
      job.status = "SENDING";
      job.attempts += 1;
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;

    try {
      const attempt = sending.correctionOf
        ? await adapter.correct(sending, file.content)
        : await adapter.publish(sending, file.content);
      return (await this.store.transact("orchestrator", {
        type: `publish.${attempt.kind}`,
        entityType: "publish-job",
        entityId: jobId,
      }, (state) => {
        const job = requireJob(state, jobId);
        if (!["SENDING", "UNKNOWN_REMOTE_STATE"].includes(job.status)) {
          throw new Error(`Publish job no longer sending: ${job.status}`);
        }
        if (attempt.kind === "published") applyReceipt(state, job, attempt.receipt);
        if (attempt.kind === "outbox") {
          if (job.status === "UNKNOWN_REMOTE_STATE") return structuredClone(job);
          job.status = "OUTBOX";
          job.blockedReason = `等待渠道 Agent 处理 ${attempt.path}`;
        }
        if (attempt.kind === "blocked") {
          job.status = "BLOCKED_CHANNEL";
          job.blockedReason = attempt.reason;
        }
        job.revision += 1;
        job.updatedAt = new Date().toISOString();
        return structuredClone(job);
      })).result;
    } catch (error) {
      return (await this.store.transact("orchestrator", {
        type: "publish.unknown-remote-state",
        entityType: "publish-job",
        entityId: jobId,
      }, (state) => {
        const job = requireJob(state, jobId);
        job.status = "UNKNOWN_REMOTE_STATE";
        job.blockedReason = "外部调用可能已成功；必须先协调远端状态，禁止盲目重发。";
        job.revision += 1;
        job.updatedAt = new Date().toISOString();
        return structuredClone(job);
      })).result;
    }
  }

  async dispatchQueued(limit = 10): Promise<{
    dispatched: PublishJob[];
    skipped: Array<{ id: string; channel: Channel; reason: string }>;
    errors: Array<{ id: string; channel: Channel; error: string }>;
  }> {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("dispatch queue limit must be a positive integer");
    const snapshot = await this.store.read();
    const adapters = await this.adapterLoader(this.root);
    const dispatched: PublishJob[] = [];
    const skipped: Array<{ id: string; channel: Channel; reason: string }> = [];
    const errors: Array<{ id: string; channel: Channel; error: string }> = [];

    for (const job of snapshot.publishJobs.filter((item) => item.status === "QUEUED").slice(0, limit)) {
      const adapter = adapters.get(job.channel);
      if (!adapter) {
        skipped.push({ id: job.id, channel: job.channel, reason: "没有对应渠道适配器" });
        continue;
      }
      let capability: ChannelCapability;
      try {
        capability = await adapter.probe();
      } catch (error) {
        errors.push({ id: job.id, channel: job.channel, error: redactSecrets(error instanceof Error ? error.message : String(error)) });
        continue;
      }
      if (capability.mode !== "DRAFT_ONLY") {
        skipped.push({
          id: job.id,
          channel: job.channel,
          reason: capability.reason ?? `仅自动处理 DRAFT_ONLY，当前模式为 ${capability.mode}`,
        });
        continue;
      }
      if (capability.approvalRequired) {
        skipped.push({ id: job.id, channel: job.channel, reason: "该渠道需要主理人明确批准后才能派发" });
        continue;
      }
      if (!capability.available) {
        skipped.push({ id: job.id, channel: job.channel, reason: capability.reason ?? "渠道不可用" });
        continue;
      }
      try {
        dispatched.push(await this.dispatch(job.id));
      } catch (error) {
        errors.push({ id: job.id, channel: job.channel, error: redactSecrets(error instanceof Error ? error.message : String(error)) });
      }
    }
    return { dispatched, skipped, errors };
  }

  async recordReceipt(jobId: string, receipt: PublishReceipt, actor = "publisher-agent"): Promise<PublishJob> {
    const before = await this.store.read();
    const beforeJob = requireJob(before, jobId);
    if (beforeJob.status !== "SUCCEEDED") {
      const adapter = (await this.adapterLoader(this.root)).get(beforeJob.channel);
      if (!adapter) throw new Error(`Unknown channel: ${beforeJob.channel}`);
      const capability = await adapter.probe();
      if (capability.approvalRequired && !beforeJob.userApproval) {
        throw new Error(`Channel ${beforeJob.channel} requires explicit user approval before recording a receipt`);
      }
    }
    return (await this.store.transact(actor, {
      type: "publish.receipt-recorded",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      validateReceipt(job, receipt);
      if (!["OUTBOX", "SENDING", "UNKNOWN_REMOTE_STATE"].includes(job.status)) {
        if (job.status === "SUCCEEDED" && job.remoteId === receipt.remoteId && job.url === receipt.url && job.publishedAt === receipt.publishedAt) {
          return structuredClone(job);
        }
        throw new Error(`Cannot attach receipt to ${job.status}`);
      }
      if (job.status === "OUTBOX") assertPublishBindings(state, job);
      applyReceipt(state, job, receipt);
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;
  }

  async approvePublish(jobId: string, approvedBy: string, note?: string, actor = "user-approval"): Promise<PublishJob> {
    const cleanedBy = approvedBy.trim().slice(0, 120);
    const cleanedNote = note?.trim().slice(0, 500);
    if (!cleanedBy) throw new Error("An approval identity is required");
    if (containsPotentialSecret(`${cleanedBy}\n${cleanedNote ?? ""}`)) {
      throw new Error("Approval contains a potential secret");
    }
    return (await this.store.transact(actor, {
      type: "publish.user-approved",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      if (!["QUEUED", "OUTBOX"].includes(job.status)) {
        throw new Error(`Cannot approve a publish job in ${job.status}`);
      }
      job.userApproval = {
        approvedAt: new Date().toISOString(),
        approvedBy: cleanedBy,
        ...(cleanedNote ? { note: cleanedNote } : {}),
      };
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;
  }

  async markRemoteUnknown(jobId: string, reason: string, actor = "channel-agent"): Promise<PublishJob> {
    const cleanedReason = reason.trim().slice(0, 500);
    if (!cleanedReason) throw new Error("An uncertain remote state reason is required");
    if (containsPotentialSecret(cleanedReason)) throw new Error("Remote state reason contains a potential secret");
    return (await this.store.transact(actor, {
      type: "publish.remote-state-unknown",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      if (!["OUTBOX", "SENDING", "UNKNOWN_REMOTE_STATE"].includes(job.status)) {
        throw new Error(`Publish job is not externally attempted: ${job.status}`);
      }
      job.status = "UNKNOWN_REMOTE_STATE";
      job.blockedReason = cleanedReason;
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;
  }

  async reconcile(actor = "orchestrator"): Promise<{
    recoveredLeases: number;
    cancelledJobs: number;
    reactivatedJobs: number;
    retryableJobs: string[];
    unresolved: string[];
  }> {
    const local = (await this.store.transact(actor, {
      type: "system.reconciled",
      entityType: "system",
    }, (state) => {
      const recoveredLeases = reclaimExpiredLeases(state);
      let cancelledJobs = 0;
      for (const job of state.publishJobs.filter((item) => OPEN_JOB_STATES.has(item.status))) {
        try {
          assertPublishBindings(state, job);
        } catch {
          invalidatePublishJob(job, "资产或证据版本已变化");
          cancelledJobs += 1;
        }
      }
      return { recoveredLeases, cancelledJobs };
    })).result;

    let snapshot = await this.store.read();
    const adapters = await this.adapterLoader(this.root);
    const reactivatable: string[] = [];
    for (const job of snapshot.publishJobs.filter((item) => item.status === "BLOCKED_CHANNEL")) {
      const adapter = adapters.get(job.channel);
      if (!adapter) continue;
      const capability = await adapter.probe();
      if (!capability.available) continue;
      try {
        assertPublishBindings(snapshot, job);
        reactivatable.push(job.id);
      } catch {
        // A stale blocked job stays blocked until a fresh job is created.
      }
    }
    let reactivatedJobs = 0;
    if (reactivatable.length > 0) {
      reactivatedJobs = (await this.store.transact(actor, {
        type: "publish.channels-reactivated",
        entityType: "system",
        details: { count: reactivatable.length },
      }, (state) => {
        let count = 0;
        for (const id of reactivatable) {
          const job = requireJob(state, id);
          if (job.status !== "BLOCKED_CHANNEL") continue;
          assertPublishBindings(state, job);
          job.status = "QUEUED";
          job.blockedReason = undefined;
          job.revision += 1;
          job.updatedAt = new Date().toISOString();
          count += 1;
        }
        return count;
      })).result;
      snapshot = await this.store.read();
    }
    const unresolved: string[] = [];
    const retryableJobs: string[] = [];
    for (const job of snapshot.publishJobs.filter((item) => item.status === "UNKNOWN_REMOTE_STATE")) {
      const adapter = adapters.get(job.channel);
      if (!adapter) { unresolved.push(job.id); continue; }
      const result = await adapter.reconcile(job);
      if (result.state === "FOUND" && result.receipt) await this.recordReceipt(job.id, result.receipt, actor);
      else if (result.state === "NOT_FOUND") {
        await this.store.transact(actor, {
          type: "publish.confirmed-not-found",
          entityType: "publish-job",
          entityId: job.id,
        }, (state) => {
          const current = requireJob(state, job.id);
          if (current.status !== "UNKNOWN_REMOTE_STATE") return;
          assertPublishBindings(state, current);
          current.status = "RETRYABLE_FAILED";
          current.blockedReason = result.reason ?? "渠道已确认不存在远端内容，可以安全重试";
          current.revision += 1;
          current.updatedAt = new Date().toISOString();
        });
        retryableJobs.push(job.id);
      } else unresolved.push(job.id);
    }
    return { ...local, reactivatedJobs, retryableJobs, unresolved };
  }

  async retryPublish(jobId: string, actor = "orchestrator"): Promise<PublishJob> {
    const before = await this.store.read();
    const beforeJob = requireJob(before, jobId);
    if (beforeJob.status !== "RETRYABLE_FAILED") throw new Error(`Publish job is not retryable: ${beforeJob.status}`);
    if (beforeJob.attempts >= MAX_PUBLISH_ATTEMPTS) {
      return (await this.store.transact(actor, {
        type: "publish.retry-exhausted",
        entityType: "publish-job",
        entityId: jobId,
      }, (state) => {
        const job = requireJob(state, jobId);
        if (job.status !== "RETRYABLE_FAILED") throw new Error(`Publish job changed: ${job.status}`);
        job.status = "CANCELLED";
        job.blockedReason = `已达到最多 ${MAX_PUBLISH_ATTEMPTS} 次外部发布尝试；请基于当前资产 revision 新建任务。`;
        job.revision += 1;
        job.updatedAt = new Date().toISOString();
        return structuredClone(job);
      })).result;
    }
    const adapters = await this.adapterLoader(this.root);
    const adapter = adapters.get(beforeJob.channel);
    if (!adapter) throw new Error(`Unknown channel: ${beforeJob.channel}`);
    const capability = await adapter.probe();
    return (await this.store.transact(actor, {
      type: "publish.retry-queued",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      if (job.status !== "RETRYABLE_FAILED") throw new Error(`Publish job changed: ${job.status}`);
      assertPublishBindings(state, job);
      job.status = capability.available ? "QUEUED" : "BLOCKED_CHANNEL";
      job.blockedReason = capability.available ? undefined : capability.reason;
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;
  }

  async confirmMissingRemote(jobId: string, reason: string, actor = "channel-agent"): Promise<PublishJob> {
    const cleanedReason = reason.trim().slice(0, 500);
    if (!cleanedReason) throw new Error("A remote absence reason is required");
    if (containsPotentialSecret(cleanedReason)) throw new Error("Remote absence reason contains a potential secret");
    return (await this.store.transact(actor, {
      type: "publish.confirmed-not-found-manually",
      entityType: "publish-job",
      entityId: jobId,
    }, (state) => {
      const job = requireJob(state, jobId);
      if (job.status !== "UNKNOWN_REMOTE_STATE") {
        throw new Error(`Publish job is not awaiting remote confirmation: ${job.status}`);
      }
      const current = publishBindingsAreCurrent(state, job);
      job.status = current ? "RETRYABLE_FAILED" : "CANCELLED";
      job.blockedReason = current
        ? `渠道已确认远端不存在，可以安全重试：${cleanedReason}`
        : `渠道已确认远端不存在；旧绑定已归档，不可按过期版本重试：${cleanedReason}`;
      job.revision += 1;
      job.updatedAt = new Date().toISOString();
      return structuredClone(job);
    })).result;
  }

  async failOpportunity(input: {
    opportunityId: string;
    worker: string;
    leaseToken: string;
    aggregateRevision: number;
    reason: string;
  }): Promise<Opportunity> {
    const reason = input.reason.trim().slice(0, 500);
    if (!reason) throw new Error("Failure reason is required");
    return (await this.store.transact(input.worker, {
      type: "opportunity.failed",
      entityType: "opportunity",
      entityId: input.opportunityId,
    }, (state) => {
      const opportunity = requireOpportunity(state, input.opportunityId);
      assertLease(opportunity, input.worker, input.leaseToken, input.aggregateRevision);
      opportunity.failureCount += 1;
      opportunity.lastError = reason;
      const nextStatus = opportunity.failureCount >= 2 ? "ARCHIVED" : "TRIAGED";
      assertTransition(opportunity.status, nextStatus);
      opportunity.status = nextStatus;
      opportunity.owner = undefined;
      opportunity.lease = undefined;
      opportunity.revision += 1;
      opportunity.updatedAt = new Date().toISOString();
      return structuredClone(opportunity);
    })).result;
  }

  async markSourceChanged(sourceId: string, newRevision: string, actor = "scout"): Promise<{ evidence: number; assets: number; jobs: number }> {
    return (await this.store.transact(actor, {
      type: "source.changed",
      entityType: "system",
      details: { sourceId, newRevision },
    }, (state) => {
      return markBindingsStale(state, sourceId, newRevision);
    })).result;
  }

  async scanSources(configPath = "ops/sources.json", actor = "scout"): Promise<Record<string, unknown>> {
    const batch = await observeSources(this.root, configPath);
    const observations = batch.observations;
    return (await this.store.transact(actor, {
      type: "sources.scanned",
      entityType: "system",
      details: { observed: observations.length, errors: batch.errors.length },
    }, (state) => {
      return applySourceObservations(state, observations, batch.errors, "replace");
    })).result;
  }

  async attestSources(
    attestationPath: string,
    configPath = "ops/sources.json",
    actor = "scout-connector",
  ): Promise<Record<string, unknown>> {
    const observations = await readSourceAttestations(this.root, attestationPath, configPath);
    return (await this.store.transact(actor, {
      type: "sources.attested",
      entityType: "system",
      details: { attestationPath, observed: observations.length },
    }, (state) => applySourceObservations(state, observations, [], "clear-attested"))).result;
  }

  async addMetric(sample: Omit<MetricSample, "id" | "capturedAt"> & { capturedAt?: string }, actor = "analyst"): Promise<MetricSample> {
    validateMetricValues(sample.values);
    return (await this.store.transact(actor, {
      type: "metric.captured",
      entityType: "asset",
      entityId: sample.assetId,
    }, (state) => {
      requireAsset(state, sample.assetId);
      const metric: MetricSample = {
        ...sample,
        id: makeId("met"),
        capturedAt: sample.capturedAt ?? new Date().toISOString(),
      };
      state.metrics.push(metric);
      return structuredClone(metric);
    })).result;
  }

  async collectInteractions(jobId: string, actor = "analyst"): Promise<{
    jobId: string;
    added: Interaction[];
    metric?: MetricSample;
    createdOpportunityIds?: string[];
  }> {
    const before = await this.store.read();
    const beforeJob = requireJob(before, jobId);
    if (beforeJob.status !== "SUCCEEDED" || !beforeJob.remoteId || !beforeJob.url || !beforeJob.publishedAt) {
      throw new Error("Interaction collection requires a published job with a real receipt");
    }
    const adapter = (await this.adapterLoader(this.root)).get(beforeJob.channel);
    if (!adapter) throw new Error(`Unknown channel: ${beforeJob.channel}`);
    const fetched = await adapter.fetchInteractions(beforeJob);
    const normalized = normalizeInteractions(beforeJob, fetched);
    const known = new Set(before.interactions.map(interactionKey));
    const additions = normalized.filter((item) => !known.has(interactionKey(item)));
    if (additions.length === 0) return { jobId, added: [], createdOpportunityIds: [] };

    return (await this.store.transact(actor, {
      type: "interactions.collected",
      entityType: "publish-job",
      entityId: jobId,
      details: { fetched: fetched.length, added: additions.length },
    }, (state) => {
      const job = requireJob(state, jobId);
      if (job.status !== "SUCCEEDED") throw new Error(`Publish job changed: ${job.status}`);
      const stateKnown = new Set(state.interactions.map(interactionKey));
      const added = additions.filter((item) => !stateKnown.has(interactionKey(item)));
      if (added.length === 0) return { jobId, added: [], createdOpportunityIds: [] };
      state.interactions.push(...added);
      const values = summarizeInteractions(state.interactions, job.assetId, job.channel);
      const metric: MetricSample = {
        id: makeId("met"),
        assetId: job.assetId,
        channel: job.channel,
        capturedAt: new Date().toISOString(),
        values,
      };
      state.metrics.push(metric);
      const feedbackOpportunity = ensureFeedbackOpportunity(state, job, new Date().toISOString());
      return {
        jobId,
        added: structuredClone(added),
        metric: structuredClone(metric),
        createdOpportunityIds: feedbackOpportunity ? [feedbackOpportunity.id] : [],
      };
    })).result;
  }

  async syncInteractions(actor = "analyst"): Promise<{
    jobs: number;
    added: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    const state = await this.store.read();
    const jobs = state.publishJobs.filter((job) =>
      job.status === "SUCCEEDED" && Boolean(job.remoteId && job.url && job.publishedAt)
    );
    let added = 0;
    const errors: Array<{ jobId: string; error: string }> = [];
    for (const job of jobs) {
      try {
        const result = await this.collectInteractions(job.id, actor);
        added += result.added.length;
      } catch (error) {
        errors.push({ jobId: job.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return { jobs: jobs.length, added, errors };
  }

  async analyzeFeedback(actor = "analyst"): Promise<{ changed: number; decisions: FeedbackDecision[] }> {
    const before = await this.store.read();
    const decisions = feedbackDecisions(before);
    const changed = decisions.filter((decision) => {
      const opportunity = before.opportunities.find((item) => item.id === decision.opportunityId)!;
      if (opportunity.status === "CLAIMED") return false;
      return opportunity.score !== decision.adjustedScore ||
        opportunity.feedback?.sampleCount !== decision.sampleCount ||
        opportunity.feedback?.shortTermScore !== decision.shortTermScore ||
        opportunity.feedback?.longTermScore !== decision.longTermScore ||
        opportunity.feedback?.adjustment !== decision.adjustment;
    });
    if (changed.length === 0) return { changed: 0, decisions };

    const changedIds = new Set(changed.map((item) => item.opportunityId));
    await this.store.transact(actor, {
      type: "feedback.analyzed",
      entityType: "system",
      details: { changed: changed.length },
    }, (state) => {
      const analyzedAt = new Date().toISOString();
      for (const decision of feedbackDecisions(state).filter((item) => changedIds.has(item.opportunityId))) {
        const opportunity = requireOpportunity(state, decision.opportunityId);
        if (opportunity.status === "CLAIMED") continue;
        opportunity.score = decision.adjustedScore;
        opportunity.feedback = {
          sampleCount: decision.sampleCount,
          shortTermScore: decision.shortTermScore,
          longTermScore: decision.longTermScore,
          adjustment: decision.adjustment,
          analyzedAt,
        };
        opportunity.revision += 1;
        opportunity.updatedAt = analyzedAt;
      }
    });
    return { changed: changed.length, decisions };
  }

  async status(): Promise<Record<string, unknown>> {
    const state = await this.store.read();
    const candidates = sortCandidates(state.opportunities.filter((item) => item.status === "TRIAGED"));
    const next = candidates[0];
    const channels = await this.channelCapabilities();
    return {
      stateRevision: state.revision,
      counts: {
        opportunities: countBy(state.opportunities, (item) => item.status),
        assets: countBy(state.assets, (item) => item.status),
        publishJobs: countBy(state.publishJobs, (item) => item.status),
        metrics: state.metrics.length,
        interactions: state.interactions.length,
      },
      workerCapacity: workerCapacity(state),
      publishPolicy: { maxAttempts: MAX_PUBLISH_ATTEMPTS },
      sourceHealth: {
        ok: state.sourceErrors.length === 0,
        errors: structuredClone(state.sourceErrors),
      },
      next: next ? {
        id: next.id,
        title: next.title,
        score: next.score,
        lane: next.lane,
        why: [
          ...scoreOpportunity(next.signals, next.directDshAction).reasons,
          ...(next.feedback ? [
            `真实反馈调整 ${next.feedback.adjustment >= 0 ? "+" : ""}${next.feedback.adjustment}`,
            `短期 ${next.feedback.shortTermScore} / 长期 ${next.feedback.longTermScore}`,
          ] : ["尚无真实反馈，沿用机会初评"]),
        ],
      } : null,
      channels,
      productionPublishingAvailable: channels.some((item) => item.available && item.mode === "REAL"),
    };
  }

  async cycle(worker?: string): Promise<Record<string, unknown>> {
    const reconciliation = await this.reconcile("orchestrator");
    const queued = await this.dispatchQueued();
    const interactions = await this.syncInteractions("analyst");
    const analysis = await this.analyzeFeedback("analyst");
    const claimed = worker ? await this.claimNext(worker) : null;
    const status = await this.status();
    return {
      action: worker ? claimed ? "CLAIMED" : "WAIT" : (status.next ? "WORK_AVAILABLE" : "WAIT"),
      reconciliation,
      queued,
      interactions,
      analysis,
      claimed,
      status,
    };
  }

  async doctor(): Promise<Record<string, unknown>> {
    const state = await this.store.read();
    const ledger = await this.store.inspectLedger();
    const ledgerRevision = ledger.lastRevision;
    const channels = await this.channelCapabilities();
    const files = ["AUTONOMOUS_PLAN.md", "ops/channels.json", "state/snapshot.json"];
    const missing = [];
    for (const path of files) {
      try { await access(await resolvePublicReadableFile(this.root, path)); } catch { missing.push(path); }
    }
    return {
      ok: missing.length === 0 && ledger.ok && ledgerRevision === state.revision,
      node: process.version,
      schemaVersion: state.schemaVersion,
      stateRevision: state.revision,
      ledgerRevision,
      ledger,
      missing,
      channels,
      productionPublishingAvailable: channels.some((item) => item.mode === "REAL" && item.available),
      actionableOpportunities: state.opportunities.filter((item) => item.status === "TRIAGED").length,
      workerCapacity: workerCapacity(state),
      publishPolicy: { maxAttempts: MAX_PUBLISH_ATTEMPTS },
      sourceHealth: {
        ok: state.sourceErrors.length === 0,
        errors: structuredClone(state.sourceErrors),
      },
      warning: state.sourceErrors.length > 0
        ? "官方源扫描部分失败；本地维护继续，但不可把当前结果当成上游无变化。"
        : "DRAFT_ONLY、MOCK 和 OUTBOX 均不代表公开发布。",
    };
  }

  private async channelCapabilities(): Promise<ChannelCapability[]> {
    const adapters = await this.adapterLoader(this.root);
    const channels: ChannelCapability[] = [];
    for (const adapter of adapters.values()) channels.push(await adapter.probe());
    return channels;
  }
}

function workerCapacity(state: StateSnapshot): { max: number; active: number; available: number } {
  const active = new Set(
    state.opportunities
      .filter((item) => item.lease)
      .map((item) => item.lease!.owner),
  ).size;
  return { max: MAX_ACTIVE_WORKERS, active, available: Math.max(0, MAX_ACTIVE_WORKERS - active) };
}

function sortCandidates(items: Opportunity[]): Opportunity[] {
  return [...items].sort((a, b) =>
    b.score - a.score || Date.parse(b.observedAt) - Date.parse(a.observedAt) ||
    a.fingerprint.localeCompare(b.fingerprint) || a.id.localeCompare(b.id)
  );
}

function requireOpportunity(state: StateSnapshot, id: string): Opportunity {
  const value = state.opportunities.find((item) => item.id === id);
  if (!value) throw new Error(`Opportunity not found: ${id}`);
  return value;
}

function requireEvidence(state: StateSnapshot, id: string): EvidencePack {
  const value = state.evidence.find((item) => item.id === id);
  if (!value) throw new Error(`Evidence not found: ${id}`);
  return value;
}

function requireAsset(state: StateSnapshot, id: string): Asset {
  const value = state.assets.find((item) => item.id === id);
  if (!value) throw new Error(`Asset not found: ${id}`);
  return value;
}

function requireJob(state: StateSnapshot, id: string): PublishJob {
  const value = state.publishJobs.find((item) => item.id === id);
  if (!value) throw new Error(`Publish job not found: ${id}`);
  return value;
}

function assertLease(opportunity: Opportunity, worker: string, token: string, revision: number): void {
  const lease = opportunity.lease;
  if (!lease || lease.owner !== worker || lease.token !== token) throw new Error("Lease owner or fencing token does not match");
  if (Date.parse(lease.expiresAt) <= Date.now()) throw new Error("Lease has expired");
  if (lease.aggregateRevision !== revision || opportunity.revision !== revision) {
    throw new Error("Aggregate revision changed; rejecting stale worker write");
  }
}

function bumpLeasedOpportunity(opportunity: Opportunity): void {
  opportunity.revision += 1;
  opportunity.updatedAt = new Date().toISOString();
  if (opportunity.lease) {
    opportunity.lease.aggregateRevision = opportunity.revision;
    opportunity.lease.expiresAt = new Date(Date.now() + DEFAULT_LEASE_MS).toISOString();
  }
}

function ensureEvidenceQuality(draft: EvidenceDraft): void {
  if (draft.kind === "UNVERIFIED" || draft.confidence < 80) throw new Error("Evidence does not meet the verification threshold");
  const official = draft.sources.some((source) => source.kind === "official" || source.kind === "repository");
  const reproduced = draft.reproduction?.result === "PASS";
  if (!official && !reproduced) throw new Error("Evidence requires an official source or successful local reproduction");
  if (draft.kind === "LOCAL_REPRODUCTION" && !reproduced) throw new Error("Local reproduction evidence must pass");
  if (draft.kind === "MULTI_SOURCE" && draft.sources.length < 2) throw new Error("Multi-source evidence requires at least two sources");
}

function ensureAssetValidation(draft: AssetValidationDraft, type: Asset["type"]): void {
  if (draft.result !== "PASS" || !draft.notes.trim()) throw new Error("Asset validation must contain a passing result and notes");
  if (Number.isNaN(Date.parse(draft.checkedAt ?? new Date().toISOString()))) throw new Error("Asset validation checkedAt is invalid");
  if (["lab", "tool", "plugin"].includes(type) && !draft.command?.trim()) {
    throw new Error(`${type} assets require the exact passing validation command`);
  }
  if (["validator", "test", "reproduction"].includes(draft.kind) && !draft.command?.trim()) {
    throw new Error(`${draft.kind} validation requires a command`);
  }
}

function materializeAssetValidation(
  draft: AssetValidationDraft,
  contentHash: string,
  checkedBy: string,
): AssetValidation {
  return {
    kind: draft.kind,
    result: "PASS",
    command: draft.command,
    notes: draft.notes.trim(),
    contentHash,
    checkedAt: draft.checkedAt ?? new Date().toISOString(),
    checkedBy,
  };
}

function reclaimExpiredLeases(state: StateSnapshot): number {
  let recovered = 0;
  const now = Date.now();
  for (const opportunity of state.opportunities) {
    if (!opportunity.lease || Date.parse(opportunity.lease.expiresAt) > now) continue;
    opportunity.failureCount += 1;
    opportunity.lastError = "工作租约过期，推定工作者未完成回写";
    if (opportunity.failureCount >= 2) {
      assertTransition(opportunity.status, "ARCHIVED");
      opportunity.status = "ARCHIVED";
    } else {
      assertTransition(opportunity.status, "TRIAGED");
      opportunity.status = "TRIAGED";
    }
    opportunity.owner = undefined;
    opportunity.lease = undefined;
    opportunity.revision += 1;
    opportunity.updatedAt = new Date().toISOString();
    recovered += 1;
  }
  return recovered;
}

function createMaintenanceOpportunity(state: StateSnapshot): Opportunity | null {
  for (const staleAsset of state.assets.filter((asset) => asset.status === "STALE")) {
    const opportunity = ensureMaintenanceForAsset(
      state,
      staleAsset,
      staleAsset.staleSourceRevision ?? String(staleAsset.revision),
    );
    if (opportunity.status === "TRIAGED") return opportunity;
  }
  const routineCandidates = state.assets
    .filter((asset) => ["READY", "PUBLISHED"].includes(asset.status) && asset.validation)
    .filter((asset) => Date.now() - Date.parse(asset.validation!.checkedAt) >= ROUTINE_MAINTENANCE_AFTER_MS)
    .sort((a, b) => Date.parse(a.validation!.checkedAt) - Date.parse(b.validation!.checkedAt) || a.id.localeCompare(b.id));
  for (const asset of routineCandidates) {
    const opportunity = ensureMaintenanceForAsset(state, asset, `routine:${asset.validation!.checkedAt}`);
    if (opportunity.status === "TRIAGED") return opportunity;
  }
  return null;
}

function ensureMaintenanceForAsset(state: StateSnapshot, asset: Asset, sourceRevision: string): Opportunity {
  const key = fingerprint(["maintenance", "retest", asset.id, sourceRevision]);
  const existing = state.opportunities.find((item) => item.fingerprint === key);
  if (existing) return existing;
  const now = new Date().toISOString();
  const signals = {
    userImpact: 65, freshness: 70, compounding: 80, ecosystemValue: 55,
    evidenceConfidence: 90, executability: 85, maintenancePenalty: 10,
  };
  const scored = scoreOpportunity(signals, true);
  const routine = sourceRevision.startsWith("routine:");
  const opportunity: Opportunity = {
    id: makeId("opp"), fingerprint: key,
    title: routine ? `例行复测：${asset.title}` : `复测并更新：${asset.title}`,
    summary: routine
      ? `资产超过例行复测窗口，需要重新检查 ${asset.canonicalPath} 的内容哈希、验证命令和来源边界。`
      : `资产依据的上游版本已经变化，需要复测 ${asset.canonicalPath}。`,
    sourceType: "maintenance", observedAt: now, directDshAction: true,
    audience: ["现有读者"], proposedAssets: ["tutorial-update"], signals,
    score: scored.score, lane: scored.lane, status: "TRIAGED", risk: "LOW",
    evidenceIds: [], assetIds: [asset.id], failureCount: 0, revision: 1, createdAt: now, updatedAt: now,
  };
  state.opportunities.push(opportunity);
  return opportunity;
}

function closeMaintenanceForAsset(state: StateSnapshot, assetId: string, at: string): void {
  for (const opportunity of state.opportunities.filter((item) =>
    item.sourceType === "maintenance" && item.assetIds.includes(assetId) && item.status !== "ARCHIVED"
  )) {
    assertTransition(opportunity.status, "ARCHIVED");
    opportunity.status = "ARCHIVED";
    opportunity.owner = undefined;
    opportunity.lease = undefined;
    opportunity.revision += 1;
    opportunity.updatedAt = at;
  }
}

function markBindingsStale(
  state: StateSnapshot,
  sourceId: string,
  newRevision: string,
): { evidence: number; assets: number; jobs: number } {
  const staleEvidence = state.evidence.filter((item) =>
    item.status !== "STALE" && (
      item.sources.some((source) => sourceReferenceMatches(source.url, sourceId)) ||
      item.baseline.repository === sourceId || item.baseline.package === sourceId
    ) && evidenceRevisionForSource(item, sourceId) !== newRevision
  );
  for (const evidence of staleEvidence) {
    evidence.status = "STALE";
    evidence.revision += 1;
  }
  const staleIds = new Set(staleEvidence.map((item) => item.id));
  const staleAssets = state.assets.filter((asset) =>
    asset.status !== "STALE" && asset.evidenceIds.some((id) => staleIds.has(id))
  );
  for (const asset of staleAssets) {
    asset.stalePriorStatus = ["DRAFT", "VERIFIED", "READY", "PUBLISHED"].includes(asset.status)
      ? asset.status as "DRAFT" | "VERIFIED" | "READY" | "PUBLISHED"
      : "READY";
    asset.status = "STALE";
    asset.staleSourceRevision = newRevision;
    asset.revision += 1;
    asset.updatedAt = new Date().toISOString();
  }
  const staleAssetIds = new Set(staleAssets.map((item) => item.id));
  const affectedJobs = state.publishJobs.filter((job) => staleAssetIds.has(job.assetId) && OPEN_JOB_STATES.has(job.status));
  for (const job of affectedJobs) {
    invalidatePublishJob(job, `来源更新到 ${newRevision}`);
  }
  for (const asset of staleAssets) ensureMaintenanceForAsset(state, asset, newRevision);
  return { evidence: staleEvidence.length, assets: staleAssets.length, jobs: affectedJobs.length };
}

function sourceReferenceMatches(url: string, sourceId: string): boolean {
  if (url === sourceId) return true;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.hostname === "github.com" && parts.length >= 5 && parts[2] === "blob") {
      return `${parts[0]}/${parts[1]}/${parts.slice(4).join("/")}` === sourceId;
    }
    if (parsed.hostname === "github.com" && parts.length >= 3) {
      return `${parts[0]}/${parts[1]}/${parts.slice(2).join("/")}` === sourceId;
    }
    if (parsed.hostname === "raw.githubusercontent.com" && parts.length >= 4) {
      return `${parts[0]}/${parts[1]}/${parts.slice(3).join("/")}` === sourceId;
    }
    if (parsed.hostname === "api.github.com" && parts.length >= 4 && parts[0] === "repos") {
      return `${parts[1]}/${parts[2]}/${parts.slice(3).join("/")}` === sourceId;
    }
  } catch {
    return false;
  }
  return false;
}

function normalizeInteractions(job: PublishJob, fetched: Interaction[]): Interaction[] {
  const seen = new Set<string>();
  const normalized: Interaction[] = [];
  for (const item of fetched) {
    if (item.channel !== job.channel) throw new Error(`Interaction channel mismatch for ${job.id}`);
    if (!["comment", "mention", "citation", "reaction"].includes(item.kind)) {
      throw new Error(`Interaction kind is invalid for ${job.id}`);
    }
    if (!item.remoteId?.trim()) throw new Error(`Interaction remoteId is empty for ${job.id}`);
    if (!item.observedAt || Number.isNaN(Date.parse(item.observedAt))) {
      throw new Error(`Interaction observedAt is invalid for ${job.id}`);
    }
    if (item.body !== undefined && typeof item.body !== "string") {
      throw new Error(`Interaction body is invalid for ${job.id}`);
    }
    if (containsPotentialSecret(`${item.remoteId}\n${item.body ?? ""}`)) {
      throw new Error(`Interaction ${item.remoteId} contains a potential secret`);
    }
    const remoteId = item.remoteId.trim();
    const key = `${job.id}\u0000${remoteId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: fingerprint(["interaction", job.id, job.channel, remoteId]),
      assetId: job.assetId,
      jobId: job.id,
      channel: job.channel,
      remoteId,
      kind: item.kind,
      ...(item.body === undefined ? {} : { body: item.body }),
      observedAt: new Date(item.observedAt).toISOString(),
    });
  }
  return normalized;
}

function interactionKey(interaction: Interaction): string {
  return `${interaction.jobId ?? ""}\u0000${interaction.remoteId}`;
}

function summarizeInteractions(interactions: Interaction[], assetId: string, channel: Channel): Record<string, number> {
  const values: Record<string, number> = {};
  for (const interaction of interactions) {
    if (interaction.assetId !== assetId || interaction.channel !== channel) continue;
    const key = `${interaction.kind}s`;
    values[key] = (values[key] ?? 0) + 1;
  }
  return values;
}

function ensureFeedbackOpportunity(state: StateSnapshot, job: PublishJob, observedAt: string): Opportunity | null {
  const substantive = state.interactions.filter((item) =>
    item.assetId === job.assetId && item.channel === job.channel && ["comment", "mention"].includes(item.kind),
  );
  if (substantive.length < 2) return null;

  const key = fingerprint(["feedback-follow-up", job.assetId, job.channel]);
  const existing = state.opportunities.find((item) => item.fingerprint === key);
  if (existing) return null;

  const asset = requireAsset(state, job.assetId);
  const signals = {
    userImpact: 75,
    freshness: 75,
    compounding: 90,
    ecosystemValue: 65,
    evidenceConfidence: 85,
    executability: 90,
    maintenancePenalty: 5,
  };
  const scored = scoreOpportunity(signals, true);
  const opportunity: Opportunity = {
    id: makeId("opp"),
    fingerprint: key,
    title: `社区重复问题：${asset.title}`,
    summary: `${asset.title} 在 ${job.channel} 已出现 ${substantive.length} 条评论或提及，整理为 FAQ 或教程修订候选。`,
    sourceType: "feedback",
    sourceUrl: job.url,
    observedAt,
    directDshAction: true,
    audience: ["已有用户", "中文读者"],
    proposedAssets: ["FAQ", "教程修订"],
    signals,
    score: scored.score,
    lane: scored.lane,
    status: "TRIAGED",
    risk: "LOW",
    evidenceIds: [],
    assetIds: [asset.id],
    failureCount: 0,
    revision: 1,
    createdAt: observedAt,
    updatedAt: observedAt,
  };
  state.opportunities.push(opportunity);
  return opportunity;
}

function ensureSourceChangeOpportunity(
  state: StateSnapshot,
  label: string,
  url: string,
  previousRevision: string,
  revision: string,
  sourceType: "official" | "ecosystem" | "community" = "official",
): Opportunity {
  const key = fingerprint(["source-change", url, revision]);
  const existing = state.opportunities.find((item) => item.fingerprint === key);
  if (existing) return existing;
  const now = new Date().toISOString();
  const signals = sourceChangeSignals(sourceType);
  const scored = scoreOpportunity(signals, true);
  const titlePrefix = sourceType === "official"
    ? "复核上游变化"
    : sourceType === "ecosystem" ? "复核生态变化" : "复核社区变化";
  const sourceLabel = sourceType === "official"
    ? "上游"
    : sourceType === "ecosystem" ? "生态来源" : "社区来源";
  const opportunity: Opportunity = {
    id: makeId("opp"), fingerprint: key, title: `${titlePrefix}：${label}`,
    summary: `${sourceLabel} revision 从 ${previousRevision} 变化为 ${revision}，需要判断用户影响并更新关联资产。`,
    sourceType, sourceUrl: url, observedAt: now, directDshAction: true,
    audience: ["DSH 用户", "教程维护者"], proposedAssets: ["变更事实卡", "兼容复测"], signals,
    score: scored.score, lane: scored.lane, status: "TRIAGED", risk: "LOW",
    evidenceIds: [], assetIds: [], failureCount: 0, revision: 1, createdAt: now, updatedAt: now,
  };
  state.opportunities.push(opportunity);
  return opportunity;
}

function sourceChangeSignals(sourceType: "official" | "ecosystem" | "community"): Opportunity["signals"] {
  if (sourceType === "ecosystem") {
    return {
      userImpact: 75, freshness: 100, compounding: 90, ecosystemValue: 100,
      evidenceConfidence: 95, executability: 90,
    };
  }
  if (sourceType === "community") {
    return {
      userImpact: 75, freshness: 95, compounding: 85, ecosystemValue: 85,
      evidenceConfidence: 80, executability: 85,
    };
  }
  return {
    userImpact: 80, freshness: 100, compounding: 90, ecosystemValue: 85,
    evidenceConfidence: 95, executability: 90,
  };
}

function assertPublishBindings(state: StateSnapshot, job: PublishJob): void {
  const asset = requireAsset(state, job.assetId);
  if (asset.revision !== job.assetRevision || asset.status === "STALE" || asset.status === "RETIRED") {
    throw new Error("Asset revision is stale");
  }
  for (const binding of job.evidenceBindings) {
    const evidence = requireEvidence(state, binding.id);
    if (evidence.revision !== binding.revision || evidence.status !== "VERIFIED") throw new Error("Evidence binding is stale");
  }
}

function applyReceipt(state: StateSnapshot, job: PublishJob, receipt: PublishReceipt): void {
  validateReceipt(job, receipt);
  const currentBindings = publishBindingsAreCurrent(state, job);
  job.status = "SUCCEEDED";
  job.remoteId = receipt.remoteId;
  job.url = receipt.url;
  job.publishedAt = receipt.publishedAt;
  job.blockedReason = undefined;
  if (job.channel === "local" || !currentBindings) return;
  const asset = requireAsset(state, job.assetId);
  asset.status = "PUBLISHED";
  asset.updatedAt = new Date().toISOString();
  const opportunity = requireOpportunity(state, job.opportunityId);
  if (opportunity.status === "READY") {
    assertTransition(opportunity.status, "RELEASED");
    opportunity.status = "RELEASED";
    opportunity.revision += 1;
    opportunity.updatedAt = asset.updatedAt;
  }
}

function publishBindingsAreCurrent(state: StateSnapshot, job: PublishJob): boolean {
  try {
    assertPublishBindings(state, job);
    return true;
  } catch {
    return false;
  }
}

function invalidatePublishJob(job: PublishJob, reason: string, at = new Date().toISOString()): void {
  if (["SENDING", "OUTBOX", "UNKNOWN_REMOTE_STATE"].includes(job.status)) {
    job.status = "UNKNOWN_REMOTE_STATE";
  } else {
    job.status = "CANCELLED";
  }
  job.blockedReason = reason;
  job.revision += 1;
  job.updatedAt = at;
}

function validateReceipt(job: PublishJob, receipt: PublishReceipt): void {
  if (!receipt.remoteId.trim()) throw new Error("remoteId is required");
  if (containsPotentialSecret(`${receipt.remoteId}\n${receipt.url}`)) throw new Error("Receipt contains a potential secret");
  const url = new URL(receipt.url);
  if (job.channel === "local") {
    if (url.protocol !== "file:") throw new Error("local receipt URL must use file protocol");
  } else if (url.protocol !== "https:") {
    throw new Error("public receipt URL must use https");
  }
  if (url.username || url.password) throw new Error("receipt URL cannot contain credentials");
  for (const key of url.searchParams.keys()) {
    if (/(?:token|key|secret|auth|signature|credential)/i.test(key)) {
      throw new Error("receipt URL cannot contain sensitive query parameters");
    }
  }
  const allowedHosts: Partial<Record<Channel, string[]>> = {
    github: ["github.com"],
    weibo: ["weibo.com"],
    zhihu: ["zhihu.com"],
    wechat: ["mp.weixin.qq.com"],
    x: ["x.com", "twitter.com"],
  };
  const hosts = allowedHosts[job.channel];
  if (hosts && !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new Error(`receipt URL host does not match channel ${job.channel}`);
  }
  if (Number.isNaN(Date.parse(receipt.publishedAt))) throw new Error("publishedAt is invalid");
}

function validateMetricValues(values: Record<string, number>): void {
  const entries = Object.entries(values);
  if (entries.length === 0) throw new Error("Metrics cannot be empty");
  for (const [key, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) throw new Error(`Invalid metric name: ${key}`);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Metric ${key} must be a non-negative finite number`);
  }
}

function sourceRefsForEvidence(evidence: EvidencePack): Asset["sourceRefs"] {
  return evidence.sources.map((source) => ({
    id: source.url,
    version: evidence.baseline.version,
    commit: evidence.baseline.commit,
  }));
}

function sourceRefsForAsset(state: StateSnapshot, asset: Asset): Asset["sourceRefs"] {
  return asset.evidenceIds.flatMap((id) => sourceRefsForEvidence(requireEvidence(state, id)));
}

function applySourceObservations(
  state: StateSnapshot,
  observations: Array<{ definition: { id: string; label: string; kind: "github-head" | "npm-latest" | "content-hash"; url: string; sourceId: string; scope?: "official" | "ecosystem" | "community" }; revision: string; observedAt: string }>,
  errors: Array<{ id: string; error: string }>,
  errorMode: "replace" | "clear-attested",
): { initialized: string[]; unchanged: string[]; changed: Array<Record<string, unknown>>; errors: Array<{ id: string; error: string }> } {
  if (errorMode === "replace") {
    const nextSourceErrors = errors.map((item) => ({
      id: item.id,
      error: redactSecrets(item.error).slice(0, 500),
      observedAt: new Date().toISOString(),
    }));
    const previousErrorKeys = state.sourceErrors.map(({ id, error }) => `${id}\u0000${error}`).sort();
    const nextErrorKeys = nextSourceErrors.map(({ id, error }) => `${id}\u0000${error}`).sort();
    if (JSON.stringify(previousErrorKeys) !== JSON.stringify(nextErrorKeys)) state.sourceErrors = nextSourceErrors;
  } else if (observations.length > 0) {
    const attestedIds = new Set(observations.map((item) => item.definition.id));
    state.sourceErrors = state.sourceErrors.filter((item) => !attestedIds.has(item.id));
  }
  const initialized: string[] = [];
  const unchanged: string[] = [];
  const changed: Array<Record<string, unknown>> = [];
  for (const observation of observations) {
    const definition = observation.definition;
    const cursor = state.sourceCursors.find((item) => item.id === definition.id);
    if (!cursor) {
      state.sourceCursors.push({
        id: definition.id,
        label: definition.label,
        kind: definition.kind,
        url: definition.url,
        sourceId: definition.sourceId,
        revision: observation.revision,
        firstObservedAt: observation.observedAt,
        lastCheckedAt: observation.observedAt,
      });
      const baselineRevisions = knownBaselineRevisions(state, definition.kind, definition.sourceId);
      if (baselineRevisions.length > 0 && baselineRevisions.some((revision) => revision !== observation.revision)) {
        const previousRevision = baselineRevisions.join(",");
        const impact = markBindingsStale(state, definition.sourceId, observation.revision);
        ensureSourceChangeOpportunity(state, definition.label, definition.url, previousRevision, observation.revision, definition.scope);
        changed.push({ id: definition.id, previousRevision, revision: observation.revision, impact, initialized: true });
      } else {
        initialized.push(definition.id);
      }
      continue;
    }
    cursor.lastCheckedAt = observation.observedAt;
    cursor.url = definition.url;
    cursor.sourceId = definition.sourceId;
    cursor.label = definition.label;
    if (cursor.revision === observation.revision) {
      unchanged.push(definition.id);
      continue;
    }
    const previousRevision = cursor.revision;
    cursor.revision = observation.revision;
    cursor.changedAt = observation.observedAt;
    const impact = markBindingsStale(state, definition.sourceId, observation.revision);
    ensureSourceChangeOpportunity(state, definition.label, definition.url, previousRevision, observation.revision, definition.scope);
    changed.push({ id: definition.id, previousRevision, revision: observation.revision, impact });
  }
  return { initialized, unchanged, changed, errors };
}

function knownBaselineRevisions(
  state: StateSnapshot,
  kind: "github-head" | "npm-latest" | "content-hash",
  sourceId: string,
): string[] {
  const revisions = state.evidence
    .map((evidence) => evidenceRevisionForSource(evidence, sourceId, kind))
    .filter((value): value is string => Boolean(value));
  return [...new Set(revisions)].sort();
}

function evidenceRevisionForSource(
  evidence: EvidencePack,
  sourceId: string,
  kind?: "github-head" | "npm-latest" | "content-hash",
): string | undefined {
  if ((!kind || kind === "github-head") && evidence.baseline.repository === sourceId) {
    return evidence.baseline.commit;
  }
  if ((!kind || kind === "npm-latest") && evidence.baseline.package === sourceId) {
    const version = evidence.baseline.version;
    if (!version) return undefined;
    const npmLatest = version.match(/(?:^|[;\s])npm-latest=([^;\s]+)/)?.[1];
    return npmLatest ?? (/^[0-9]+\.[0-9]+\.[0-9]+/.test(version) ? version : undefined);
  }
  return undefined;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
