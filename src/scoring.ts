import type { ScoreResult, ScoreSignals } from "./types.ts";

const WEIGHTS = {
  userImpact: 0.25,
  freshness: 0.20,
  compounding: 0.20,
  ecosystemValue: 0.15,
  evidenceConfidence: 0.10,
  executability: 0.10,
} as const;

function bounded(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) throw new Error(`Score value must be finite: ${value}`);
  return Math.min(max, Math.max(min, value));
}

export function scoreOpportunity(signals: ScoreSignals, directDshAction: boolean): ScoreResult {
  if (!directDshAction) {
    return {
      eligible: false,
      score: 0,
      lane: "INELIGIBLE",
      reasons: ["缺少直接的 DSH 用户动作或工程价值"],
    };
  }

  const weighted = Object.entries(WEIGHTS).reduce((total, [key, weight]) => {
    return total + bounded(signals[key as keyof typeof WEIGHTS]) * weight;
  }, 0);
  const penalties =
    bounded(signals.duplicatePenalty ?? 0, 0, 30) +
    bounded(signals.riskPenalty ?? 0, 0, 30) +
    bounded(signals.maintenancePenalty ?? 0, 0, 20);
  const score = Math.round(bounded(weighted - penalties));
  const lane = score >= 75 ? "DUAL_TRACK" : score >= 60 ? "CANONICAL" : "BACKLOG";
  const reasons = [
    `基础加权分 ${weighted.toFixed(1)}`,
    penalties > 0 ? `重复、风险或维护成本扣 ${penalties.toFixed(1)} 分` : "无额外扣分",
  ];
  return { eligible: true, score, lane, reasons };
}
