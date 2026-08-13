import type { EvidenceKind, EvidenceSource, RiskLevel, ScoreSignals } from "./types.ts";

export interface AssetValidationDraft {
  kind: "content-review" | "validator" | "test" | "reproduction";
  result: "PASS";
  command?: string;
  notes: string;
  checkedAt?: string;
}

export interface OpportunityDraft {
  title: string;
  summary: string;
  sourceType: "official" | "ecosystem" | "community" | "feedback" | "maintenance";
  sourceUrl?: string;
  observedAt?: string;
  directDshAction: boolean;
  audience: string[];
  proposedAssets: string[];
  signals: ScoreSignals;
  risk?: RiskLevel;
}

export interface EvidenceDraft {
  claim: string;
  kind: EvidenceKind;
  sources: EvidenceSource[];
  baseline?: { repository?: string; commit?: string; package?: string; version?: string };
  reproduction?: {
    environment: string;
    commands: string[];
    result: "PASS" | "FAIL" | "NOT_RUN";
    notes: string;
  };
  confidence: number;
}

const OPPORTUNITY_KEYS = new Set([
  "title", "summary", "sourceType", "sourceUrl", "observedAt", "directDshAction",
  "audience", "proposedAssets", "signals", "risk",
]);
const SIGNAL_KEYS = new Set([
  "userImpact", "freshness", "compounding", "ecosystemValue", "evidenceConfidence",
  "executability", "duplicatePenalty", "riskPenalty", "maintenancePenalty",
]);
const EVIDENCE_KEYS = new Set(["claim", "kind", "sources", "baseline", "reproduction", "confidence"]);

export function parseOpportunityDraft(value: unknown): OpportunityDraft {
  const object = asObject(value, "opportunity");
  rejectUnknown(object, OPPORTUNITY_KEYS, "opportunity");
  const sourceType = oneOf(object.sourceType, ["official", "ecosystem", "community", "feedback", "maintenance"] as const, "sourceType");
  const risk = object.risk === undefined ? undefined : oneOf(object.risk, ["LOW", "MEDIUM", "HIGH"] as const, "risk");
  const signalsObject = asObject(object.signals, "signals");
  rejectUnknown(signalsObject, SIGNAL_KEYS, "signals");
  const signals: ScoreSignals = {
    userImpact: boundedNumber(signalsObject.userImpact, "userImpact"),
    freshness: boundedNumber(signalsObject.freshness, "freshness"),
    compounding: boundedNumber(signalsObject.compounding, "compounding"),
    ecosystemValue: boundedNumber(signalsObject.ecosystemValue, "ecosystemValue"),
    evidenceConfidence: boundedNumber(signalsObject.evidenceConfidence, "evidenceConfidence"),
    executability: boundedNumber(signalsObject.executability, "executability"),
    duplicatePenalty: optionalPenalty(signalsObject.duplicatePenalty, "duplicatePenalty", 30),
    riskPenalty: optionalPenalty(signalsObject.riskPenalty, "riskPenalty", 30),
    maintenancePenalty: optionalPenalty(signalsObject.maintenancePenalty, "maintenancePenalty", 20),
  };
  return {
    title: nonEmptyString(object.title, "title"),
    summary: nonEmptyString(object.summary, "summary"),
    sourceType,
    sourceUrl: optionalUrl(object.sourceUrl, "sourceUrl"),
    observedAt: optionalIsoDate(object.observedAt, "observedAt"),
    directDshAction: booleanValue(object.directDshAction, "directDshAction"),
    audience: stringArray(object.audience, "audience"),
    proposedAssets: stringArray(object.proposedAssets, "proposedAssets"),
    signals,
    risk,
  };
}

export function parseEvidenceDraft(value: unknown): EvidenceDraft {
  const object = asObject(value, "evidence");
  rejectUnknown(object, EVIDENCE_KEYS, "evidence");
  const sources = arrayValue(object.sources, "sources").map((source, index) => {
    const item = asObject(source, `sources[${index}]`);
    rejectUnknown(item, new Set(["url", "title", "kind", "publishedAt", "accessedAt"]), `sources[${index}]`);
    return {
      url: validUrl(item.url, `sources[${index}].url`),
      title: nonEmptyString(item.title, `sources[${index}].title`),
      kind: oneOf(item.kind, ["official", "repository", "paper", "community"] as const, `sources[${index}].kind`),
      publishedAt: optionalIsoDate(item.publishedAt, `sources[${index}].publishedAt`),
      accessedAt: isoDate(item.accessedAt, `sources[${index}].accessedAt`),
    } satisfies EvidenceSource;
  });
  const baseline = object.baseline === undefined ? {} : stringRecord(asObject(object.baseline, "baseline"), ["repository", "commit", "package", "version"]);
  let reproduction: EvidenceDraft["reproduction"];
  if (object.reproduction !== undefined) {
    const item = asObject(object.reproduction, "reproduction");
    rejectUnknown(item, new Set(["environment", "commands", "result", "notes"]), "reproduction");
    reproduction = {
      environment: nonEmptyString(item.environment, "reproduction.environment"),
      commands: stringArray(item.commands, "reproduction.commands"),
      result: oneOf(item.result, ["PASS", "FAIL", "NOT_RUN"] as const, "reproduction.result"),
      notes: nonEmptyString(item.notes, "reproduction.notes"),
    };
  }
  return {
    claim: nonEmptyString(object.claim, "claim"),
    kind: oneOf(object.kind, ["OFFICIAL_SOURCE", "LOCAL_REPRODUCTION", "MULTI_SOURCE", "UNVERIFIED"] as const, "kind"),
    sources,
    baseline,
    reproduction,
    confidence: boundedNumber(object.confidence, "confidence"),
  };
}

export function parseAssetValidationDraft(value: unknown): AssetValidationDraft {
  const object = asObject(value, "asset validation");
  rejectUnknown(object, new Set(["kind", "result", "command", "notes", "checkedAt"]), "asset validation");
  return {
    kind: oneOf(object.kind, ["content-review", "validator", "test", "reproduction"] as const, "kind"),
    result: oneOf(object.result, ["PASS"] as const, "result"),
    command: object.command === undefined ? undefined : nonEmptyString(object.command, "command"),
    notes: nonEmptyString(object.notes, "notes"),
    checkedAt: optionalIsoDate(object.checkedAt, "checkedAt"),
  };
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function rejectUnknown(object: Record<string, unknown>, allowed: Set<string>, label: string): void {
  const unknown = Object.keys(object).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error(`${label} contains unknown fields: ${unknown.join(", ")}`);
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function stringArray(value: unknown, label: string): string[] {
  return arrayValue(value, label).map((item, index) => nonEmptyString(item, `${label}[${index}]`));
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
}

function boundedNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100`);
  }
  return value;
}

function optionalPenalty(value: unknown, label: string, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label} must be between 0 and ${max}`);
  }
  return value;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error(`${label} is invalid`);
  return value as T;
}

function validUrl(value: unknown, label: string): string {
  const text = nonEmptyString(value, label);
  const url = new URL(text);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`${label} must use http or https`);
  assertPublicUrl(url, label);
  return url.toString();
}

function optionalUrl(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : validUrl(value, label);
}

function isoDate(value: unknown, label: string): string {
  const text = nonEmptyString(value, label);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${label} must be an ISO date`);
  return new Date(text).toISOString();
}

function optionalIsoDate(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : isoDate(value, label);
}

function stringRecord(object: Record<string, unknown>, keys: string[]): Record<string, string> {
  rejectUnknown(object, new Set(keys), "record");
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, nonEmptyString(value, key)]));
}

function assertPublicUrl(url: URL, label: string): void {
  if (url.username || url.password) throw new Error(`${label} cannot contain URL credentials`);
  for (const key of url.searchParams.keys()) {
    if (/(?:token|key|secret|auth|signature|credential)/i.test(key)) {
      throw new Error(`${label} cannot contain sensitive query parameters`);
    }
  }
}
