import { scoreOpportunity } from "./scoring.ts";
import type { MetricSample, Opportunity, StateSnapshot } from "./types.ts";

export interface FeedbackDecision {
  opportunityId: string;
  sampleCount: number;
  shortTermScore: number;
  longTermScore: number;
  adjustment: number;
  adjustedScore: number;
  mature: boolean;
  reasons: string[];
}

const REACH_KEYS = ["views", "reads", "impressions", "searchVisits"] as const;
const USE_KEYS = ["saves", "downloads", "stars", "forks"] as const;
const RELATION_KEYS = ["comments", "citations", "upstreamReplies", "repeatQuestions"] as const;

export function feedbackDecisions(state: StateSnapshot): FeedbackDecision[] {
  const samplesByOpportunity = new Map<string, MetricSample[]>();
  const opportunityByAsset = new Map(
    state.assets.map((asset) => [asset.id, asset.opportunityId] as const),
  );
  for (const sample of latestSamples(state.metrics)) {
    const opportunityId = opportunityByAsset.get(sample.assetId);
    if (!opportunityId) continue;
    const samples = samplesByOpportunity.get(opportunityId) ?? [];
    samples.push(sample);
    samplesByOpportunity.set(opportunityId, samples);
  }

  return state.opportunities.flatMap((opportunity) => {
    const samples = samplesByOpportunity.get(opportunity.id);
    if (!samples?.length) return [];
    return [decisionFor(opportunity, samples)];
  });
}

function decisionFor(opportunity: Opportunity, samples: MetricSample[]): FeedbackDecision {
  const values = sumValues(samples);
  const reach = sumKeys(values, REACH_KEYS);
  const use =
    value(values, "saves") * 8 + value(values, "downloads") * 12 +
    value(values, "stars") * 6 + value(values, "forks") * 8;
  const relationship =
    value(values, "comments") * 2 + value(values, "citations") * 15 +
    value(values, "upstreamReplies") * 20 + value(values, "repeatQuestions") * 8;
  const shortTermScore = logarithmicScore(reach, 10_000);
  const longTermScore = logarithmicScore(use + relationship, 1_000);
  const mature = reach >= 100 || use + relationship >= 10 || samples.length >= 3;
  const combined = shortTermScore * 0.4 + longTermScore * 0.6;
  const adjustment = mature ? clamp(Math.round((combined - 50) / 10), -5, 5) : 0;
  const base = scoreOpportunity(opportunity.signals, opportunity.directDshAction).score;
  return {
    opportunityId: opportunity.id,
    sampleCount: samples.length,
    shortTermScore,
    longTermScore,
    adjustment,
    adjustedScore: clamp(base + adjustment, 0, 100),
    mature,
    reasons: [
      `短期触达 ${Math.round(reach)}`,
      `长期使用信号 ${Math.round(use)}`,
      `引用与社区信号 ${Math.round(relationship)}`,
      mature ? `反馈调整 ${adjustment >= 0 ? "+" : ""}${adjustment}` : "样本不足，不调整排序",
    ],
  };
}

function latestSamples(samples: MetricSample[]): MetricSample[] {
  const latest = new Map<string, MetricSample>();
  for (const sample of samples) {
    const key = `${sample.assetId}\u0000${sample.channel}`;
    const previous = latest.get(key);
    if (!previous || Date.parse(sample.capturedAt) > Date.parse(previous.capturedAt)) latest.set(key, sample);
  }
  return [...latest.values()];
}

function sumValues(samples: MetricSample[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const sample of samples) {
    for (const [key, amount] of Object.entries(sample.values)) result[key] = (result[key] ?? 0) + amount;
  }
  return result;
}

function value(values: Record<string, number>, key: string): number {
  return Math.max(0, values[key] ?? 0);
}

function sumKeys(values: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((total, key) => total + value(values, key), 0);
}

function logarithmicScore(value: number, reference: number): number {
  if (value <= 0) return 0;
  return Math.round(clamp((Math.log1p(value) / Math.log1p(reference)) * 100, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
