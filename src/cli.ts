#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { Orchestrator } from "./orchestrator.ts";
import { parseAssetValidationDraft, parseEvidenceDraft, parseOpportunityDraft } from "./input.ts";
import { redactSecrets } from "./risk.ts";
import { readPublicContent } from "./content.ts";
import { renderLongformFile } from "./render.ts";
import { auditPublicFiles } from "./public-audit.ts";
import type { Asset, Channel } from "./types.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const orchestrator = new Orchestrator(root);

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2);
  const parsed = parseArgs(args);
  let result: unknown;

  switch (command) {
    case "init":
      await orchestrator.init();
      result = { initialized: true, root };
      break;
    case "scan": {
      const path = requirePositional(parsed, 0, "scan requires a JSON file");
      const value = await readJson(path);
      if (!Array.isArray(value)) throw new Error("scan input must be an array");
      result = await orchestrator.scan(value.map(parseOpportunityDraft));
      break;
    }
    case "watch":
      result = await orchestrator.scanSources(optionalFlag(parsed, "file") ?? "ops/sources.json");
      break;
    case "source-attest":
      result = await orchestrator.attestSources(
        requirePositional(parsed, 0, "source-attest requires an attestation JSON file"),
        optionalFlag(parsed, "sources") ?? "ops/sources.json",
      );
      break;
    case "next":
      result = await orchestrator.next(numberFlag(parsed, "limit", 10));
      break;
    case "claim-next":
    case "claim":
      result = await orchestrator.claimNext(requiredFlag(parsed, "worker"), numberFlag(parsed, "lease-ms", 30 * 60 * 1000));
      break;
    case "verify": {
      const opportunityId = requirePositional(parsed, 0, "verify requires opportunity id");
      const evidence = parseEvidenceDraft(await readJson(requiredFlag(parsed, "file")));
      result = await orchestrator.verify(
        opportunityId,
        requiredFlag(parsed, "worker"),
        requiredFlag(parsed, "token"),
        numberFlag(parsed, "revision"),
        evidence,
      );
      break;
    }
    case "evidence-augment": {
      const evidenceId = requirePositional(parsed, 0, "evidence-augment requires evidence id");
      const evidence = parseEvidenceDraft(await readJson(requiredFlag(parsed, "file")));
      result = await orchestrator.augmentEvidence(evidenceId, evidence);
      break;
    }
    case "asset-register": {
      const opportunityId = requirePositional(parsed, 0, "asset-register requires opportunity id");
      result = await orchestrator.registerAsset({
        opportunityId,
        worker: requiredFlag(parsed, "worker"),
        leaseToken: requiredFlag(parsed, "token"),
        aggregateRevision: numberFlag(parsed, "revision"),
        type: assetType(requiredFlag(parsed, "type")),
        title: requiredFlag(parsed, "title"),
        canonicalPath: requiredFlag(parsed, "path"),
      });
      break;
    }
    case "asset-ready": {
      const assetId = requirePositional(parsed, 0, "asset-ready requires asset id");
      result = await orchestrator.readyAsset({
        assetId,
        worker: requiredFlag(parsed, "worker"),
        leaseToken: requiredFlag(parsed, "token"),
        aggregateRevision: numberFlag(parsed, "revision"),
        validation: parseAssetValidationDraft(await readJson(requiredFlag(parsed, "validation-file"))),
      });
      break;
    }
    case "asset-attest": {
      const assetId = requirePositional(parsed, 0, "asset-attest requires asset id");
      result = await orchestrator.attestAsset(
        assetId,
        parseAssetValidationDraft(await readJson(requiredFlag(parsed, "validation-file"))),
      );
      break;
    }
    case "maintenance-complete": {
      const opportunityId = requirePositional(parsed, 0, "maintenance-complete requires opportunity id");
      result = await orchestrator.completeMaintenance({
        opportunityId,
        worker: requiredFlag(parsed, "worker"),
        leaseToken: requiredFlag(parsed, "token"),
        aggregateRevision: numberFlag(parsed, "revision"),
        validation: parseAssetValidationDraft(await readJson(requiredFlag(parsed, "validation-file"))),
      });
      break;
    }
    case "asset-revise": {
      const assetId = requirePositional(parsed, 0, "asset-revise requires asset id");
      result = await orchestrator.reviseAsset(
        assetId,
        parseAssetValidationDraft(await readJson(requiredFlag(parsed, "validation-file"))),
        optionalFlag(parsed, "path"),
      );
      break;
    }
    case "publish": {
      const assetId = requirePositional(parsed, 0, "publish requires asset id");
      const channelFlags = allFlags(parsed, "channel");
      if (channelFlags.length === 0) throw new Error("publish requires at least one --channel channel=path");
      const variants: Partial<Record<Channel, string>> = {};
      for (const entry of channelFlags) {
        const separator = entry.indexOf("=");
        if (separator < 1) throw new Error(`Invalid --channel value: ${entry}`);
        const channel = channelValue(entry.slice(0, separator));
        variants[channel] = entry.slice(separator + 1);
      }
      result = await orchestrator.queuePublish(assetId, variants);
      break;
    }
    case "dispatch":
      result = await orchestrator.dispatch(
        requirePositional(parsed, 0, "dispatch requires publish job id"),
        booleanFlag(parsed, "allow-mock"),
      );
      break;
    case "dispatch-queued":
      result = await orchestrator.dispatchQueued(numberFlag(parsed, "limit", 10));
      break;
    case "correct":
      result = await orchestrator.queueCorrection(
        requirePositional(parsed, 0, "correct requires original publish job id"),
        requiredFlag(parsed, "path"),
      );
      break;
    case "receipt":
      result = await orchestrator.recordReceipt(requirePositional(parsed, 0, "receipt requires publish job id"), {
        remoteId: requiredFlag(parsed, "remote-id"),
        url: requiredFlag(parsed, "url"),
        publishedAt: requiredFlag(parsed, "published-at"),
      });
      break;
    case "remote-unknown":
      result = await orchestrator.markRemoteUnknown(
        requirePositional(parsed, 0, "remote-unknown requires publish job id"),
        requiredFlag(parsed, "reason"),
      );
      break;
    case "reconcile":
      result = await orchestrator.reconcile();
      break;
    case "retry":
      result = await orchestrator.retryPublish(requirePositional(parsed, 0, "retry requires publish job id"));
      break;
    case "confirm-not-found":
      result = await orchestrator.confirmMissingRemote(
        requirePositional(parsed, 0, "confirm-not-found requires publish job id"),
        requiredFlag(parsed, "reason"),
      );
      break;
    case "fail":
      result = await orchestrator.failOpportunity({
        opportunityId: requirePositional(parsed, 0, "fail requires opportunity id"),
        worker: requiredFlag(parsed, "worker"),
        leaseToken: requiredFlag(parsed, "token"),
        aggregateRevision: numberFlag(parsed, "revision"),
        reason: requiredFlag(parsed, "reason"),
      });
      break;
    case "stale":
      result = await orchestrator.markSourceChanged(requiredFlag(parsed, "source"), requiredFlag(parsed, "revision"));
      break;
    case "measure": {
      const assetId = requirePositional(parsed, 0, "measure requires asset id");
      const values = await readJson(requiredFlag(parsed, "file"));
      if (!isNumberRecord(values)) throw new Error("metric file must be a JSON object containing only numbers");
      result = await orchestrator.addMetric({ assetId, channel: channelValue(requiredFlag(parsed, "channel")), values });
      break;
    }
    case "collect-interactions":
      result = await orchestrator.collectInteractions(
        requirePositional(parsed, 0, "collect-interactions requires publish job id"),
      );
      break;
    case "sync-interactions":
      result = await orchestrator.syncInteractions();
      break;
    case "analyze":
      result = await orchestrator.analyzeFeedback();
      break;
    case "status":
      result = await orchestrator.status();
      break;
    case "cycle":
      result = await orchestrator.cycle(optionalFlag(parsed, "worker"));
      break;
    case "render": {
      const channel = channelValue(requiredFlag(parsed, "channel"));
      if (channel !== "github" && channel !== "zhihu" && channel !== "wechat") {
        throw new Error("render currently supports github, zhihu or wechat");
      }
      result = await renderLongformFile(
        root,
        requirePositional(parsed, 0, "render requires a canonical article"),
        requiredFlag(parsed, "output"),
        channel,
      );
      break;
    }
    case "doctor":
      result = await orchestrator.doctor();
      break;
    case "public-audit":
      result = await auditPublicFiles(root);
      if (!(result as { ok: boolean }).ok) process.exitCode = 2;
      break;
    case "help":
    case "--help":
    case "-h":
      result = { usage: usage() };
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }

  process.stdout.write(`${JSON.stringify({ ok: true, command, result }, null, 2)}\n`);
}

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string[]>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) { positional.push(value); continue; }
    const key = value.slice(2);
    const next = args[index + 1];
    const flagValue = !next || next.startsWith("--") ? "true" : args[++index];
    flags.set(key, [...(flags.get(key) ?? []), flagValue]);
  }
  return { positional, flags };
}

function requirePositional(args: ParsedArgs, index: number, message: string): string {
  const value = args.positional[index];
  if (!value) throw new Error(message);
  return value;
}

function requiredFlag(args: ParsedArgs, name: string): string {
  const value = args.flags.get(name)?.at(-1);
  if (!value || value === "true") throw new Error(`--${name} is required`);
  return value;
}

function allFlags(args: ParsedArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

function optionalFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name)?.at(-1);
  return !value || value === "true" ? undefined : value;
}

function numberFlag(args: ParsedArgs, name: string, fallback?: number): number {
  const raw = args.flags.get(name)?.at(-1);
  if (raw === undefined && fallback !== undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a non-negative number`);
  return value;
}

function booleanFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.get(name)?.at(-1) === "true";
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse((await readPublicContent(root, path)).content);
}

function channelValue(value: string): Channel {
  if (!["github", "weibo", "zhihu", "wechat", "x", "local"].includes(value)) throw new Error(`Unknown channel: ${value}`);
  return value as Channel;
}

function assetType(value: string): Asset["type"] {
  if (!["flash", "tutorial", "faq", "lab", "tool", "plugin", "upstream-report"].includes(value)) {
    throw new Error(`Unknown asset type: ${value}`);
  }
  return value as Asset["type"];
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));
}

function usage(): string[] {
  return [
    "init",
    "doctor",
    "public-audit",
    "scan <opportunities.json>",
    "watch [--file ops/sources.json]",
    "source-attest <attestations.json> [--sources ops/sources.json]",
    "next [--limit 10]",
    "claim-next --worker <id> [--lease-ms <ms>]",
    "verify <opportunity-id> --worker <id> --token <lease> --revision <n> --file <evidence.json>",
    "evidence-augment <evidence-id> --file <evidence.json>",
    "asset-register <opportunity-id> --worker <id> --token <lease> --revision <n> --type <type> --title <title> --path <file>",
    "asset-ready <asset-id> --worker <id> --token <lease> --revision <n> --validation-file <validation.json>",
    "asset-attest <asset-id> --validation-file <validation.json>",
    "maintenance-complete <opportunity-id> --worker <id> --token <lease> --revision <n> --validation-file <validation.json>",
    "asset-revise <asset-id> --validation-file <validation.json> [--path <canonical-file>]",
    "publish <asset-id> --channel github=content/file.md [--channel weibo=content/weibo.md]",
    "dispatch <publish-job-id> [--allow-mock]",
    "dispatch-queued [--limit 10]",
    "correct <published-job-id> --path <corrected-variant>",
    "receipt <publish-job-id> --remote-id <id> --url <url> --published-at <ISO>",
    "remote-unknown <publish-job-id> --reason <uncertain external result>",
    "reconcile",
    "retry <publish-job-id>",
    "confirm-not-found <publish-job-id> --reason <channel verification>",
    "fail <opportunity-id> --worker <id> --token <lease> --revision <n> --reason <text>",
    "stale --source <url-or-package> --revision <version>",
    "measure <asset-id> --channel <channel> --file <metrics.json>",
    "collect-interactions <publish-job-id>",
    "sync-interactions",
    "analyze",
    "status",
    "cycle [--worker <id>]",
    "render <canonical.md> --channel <github|zhihu|wechat> --output <file>",
  ];
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, error: redactSecrets(message) }, null, 2)}\n`);
  process.exitCode = 1;
});
