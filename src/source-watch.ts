import { createHash } from "node:crypto";
import { readPublicContent } from "./content.ts";

export type SourceKind = "github-head" | "npm-latest" | "content-hash";

export interface SourceDefinition {
  id: string;
  label: string;
  kind: SourceKind;
  url: string;
  sourceId: string;
  enabled: boolean;
}

export interface SourceObservation {
  definition: SourceDefinition;
  revision: string;
  observedAt: string;
}

export interface SourceObservationBatch {
  observations: SourceObservation[];
  errors: Array<{ id: string; error: string }>;
}

/**
 * A connector or channel Agent can attest a source it has already inspected.
 * The attestation carries only the public revision, never fetched content or
 * credentials. This is the escape hatch for environments where the local
 * runtime cannot reach GitHub, npm, or another public source directly.
 */
export interface SourceAttestationDraft {
  id: string;
  revision: string;
  observedAt?: string;
}

export interface SourceWatchOptions {
  /** Maximum number of network attempts for a source. */
  maxAttempts?: number;
  /** Base delay between attempts. The delay doubles after each failed attempt. */
  retryDelayMs?: number;
  /** Per-attempt request timeout. */
  timeoutMs?: number;
}

const DEFAULT_SOURCE_WATCH_OPTIONS: Required<SourceWatchOptions> = {
  maxAttempts: 3,
  retryDelayMs: 250,
  timeoutMs: 20_000,
};

export async function observeSources(
  root: string,
  configPath = "ops/sources.json",
  options: SourceWatchOptions = {},
): Promise<SourceObservationBatch> {
  const definitions = await readSourceDefinitions(root, configPath);
  const watchOptions = normalizeOptions(options);
  const settled = await Promise.allSettled(definitions.map((definition) => observe(definition, watchOptions)));
  const observations: SourceObservation[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") observations.push(result.value);
    else errors.push({
      id: definitions[index].id,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });
  return { observations, errors };
}

export async function readSourceDefinitions(root: string, configPath = "ops/sources.json"): Promise<SourceDefinition[]> {
  const raw = (await readPublicContent(root, configPath)).content;
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("source config must be an array");
  return value.map(parseDefinition).filter((item) => item.enabled);
}

export async function readSourceAttestations(
  root: string,
  attestationPath: string,
  configPath = "ops/sources.json",
): Promise<SourceObservation[]> {
  const raw = (await readPublicContent(root, attestationPath)).content;
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("source attestation input must be an array");
  const definitions = await readSourceDefinitions(root, configPath);
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return value.map((item, index) => {
    if (!isObject(item)) throw new Error(`attestations[${index}] must be an object`);
    const unknown = Object.keys(item).filter((key) => !["id", "revision", "observedAt"].includes(key));
    if (unknown.length) throw new Error(`attestations[${index}] contains unknown fields: ${unknown.join(", ")}`);
    const id = requiredString(item.id, `attestations[${index}].id`);
    const definition = byId.get(id);
    if (!definition) throw new Error(`attestations[${index}] references an unknown or disabled source: ${id}`);
    const revision = requiredString(item.revision, `attestations[${index}].revision`).slice(0, 500);
    if (containsSensitiveRevision(revision)) throw new Error(`attestations[${index}].revision contains a potential secret`);
    const observedAt = item.observedAt === undefined
      ? new Date().toISOString()
      : isoDate(item.observedAt, `attestations[${index}].observedAt`);
    return { definition, revision, observedAt } satisfies SourceObservation;
  });
}

function parseDefinition(value: unknown, index: number): SourceDefinition {
  if (!isObject(value)) throw new Error(`sources[${index}] must be an object`);
  const allowed = new Set(["id", "label", "kind", "url", "sourceId", "enabled"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`sources[${index}] contains unknown fields: ${unknown.join(", ")}`);
  const kind = requiredString(value.kind, `sources[${index}].kind`);
  if (!["github-head", "npm-latest", "content-hash"].includes(kind)) {
    throw new Error(`sources[${index}].kind is invalid`);
  }
  const url = new URL(requiredString(value.url, `sources[${index}].url`));
  if (url.protocol !== "https:") throw new Error(`sources[${index}].url must use https`);
  if (url.username || url.password) throw new Error(`sources[${index}].url cannot contain credentials`);
  for (const key of url.searchParams.keys()) {
    if (/(?:token|key|secret|auth|signature|credential)/i.test(key)) {
      throw new Error(`sources[${index}].url cannot contain sensitive query parameters`);
    }
  }
  if (typeof value.enabled !== "boolean") throw new Error(`sources[${index}].enabled must be boolean`);
  return {
    id: requiredString(value.id, `sources[${index}].id`),
    label: requiredString(value.label, `sources[${index}].label`),
    kind: kind as SourceKind,
    url: url.toString(),
    sourceId: requiredString(value.sourceId, `sources[${index}].sourceId`),
    enabled: value.enabled,
  };
}

async function observe(
  definition: SourceDefinition,
  options: Required<SourceWatchOptions>,
): Promise<SourceObservation> {
  let lastError: unknown = new Error("unknown source-watch failure");
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(definition.url, {
        headers: {
          Accept: definition.kind === "content-hash" ? "text/plain" : "application/json",
          "User-Agent": "dsh-learn-source-watch/0.1",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      lastError = error;
      if (attempt < options.maxAttempts) await delay(options.retryDelayMs * 2 ** (attempt - 1));
      continue;
    }

    if (!response.ok) {
      const message = `HTTP ${response.status}`;
      if (!isRetryableStatus(response.status)) {
        throw new Error(`Source ${definition.id} returned ${message}`);
      }
      lastError = new Error(message);
      if (attempt < options.maxAttempts) await delay(options.retryDelayMs * 2 ** (attempt - 1));
      continue;
    }

    const revision = await extractRevision(definition.kind, response);
    return { definition, revision, observedAt: new Date().toISOString() };
  }

  throw new Error(`Source ${definition.id} failed after ${options.maxAttempts} attempts: ${errorMessage(lastError)}`);
}

function normalizeOptions(options: SourceWatchOptions): Required<SourceWatchOptions> {
  const normalized = { ...DEFAULT_SOURCE_WATCH_OPTIONS, ...options };
  if (!Number.isInteger(normalized.maxAttempts) || normalized.maxAttempts < 1) {
    throw new Error("source watch maxAttempts must be a positive integer");
  }
  if (!Number.isFinite(normalized.retryDelayMs) || normalized.retryDelayMs < 0) {
    throw new Error("source watch retryDelayMs must be a non-negative number");
  }
  if (!Number.isFinite(normalized.timeoutMs) || normalized.timeoutMs < 1) {
    throw new Error("source watch timeoutMs must be a positive number");
  }
  return normalized;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function extractRevision(kind: SourceKind, response: Response): Promise<string> {
  if (kind === "content-hash") {
    const text = await response.text();
    return createHash("sha256").update(text).digest("hex");
  }
  const value: unknown = await response.json();
  if (!isObject(value)) throw new Error("Source response must be an object");
  const field = kind === "github-head" ? "sha" : "version";
  return requiredString(value[field], `source response ${field}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function isoDate(value: unknown, label: string): string {
  const text = requiredString(value, label);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${label} must be an ISO date`);
  return new Date(text).toISOString();
}

function containsSensitiveRevision(value: string): boolean {
  return /(?:sk-[A-Za-z0-9]|gh[pousr]_[A-Za-z0-9]|token[=:]|secret[=:]|password[=:])/i.test(value);
}
