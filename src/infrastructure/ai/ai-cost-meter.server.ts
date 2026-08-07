/**
 * AI cost meter + budget guard (FlyRank A6 pattern).
 *
 * Every OpenAI call records estimated USD spend and attributes it to a feature.
 * When cumulative spend would exceed AI_BUDGET_USD, callers skip the API and use
 * their deterministic fallback instead of burning budget silently.
 *
 * Production meters persist per-user rows in `ai_usage_records`; tests use the
 * in-memory factory below.
 */

import type { AiSpendSnapshot, AiSpendStatus } from "@/domain/ai-spend";
import { formatAiFeatureLabel } from "@/domain/ai-spend";
import type { AiCostMeter, AiUsageRecord } from "@/domain/ports";

export type { AiUsageRecord };

/** gpt-4o-mini list pricing (USD per 1M tokens) — update if model changes. */
const GPT4O_MINI_INPUT_PER_1M = 0.15;
const GPT4O_MINI_OUTPUT_PER_1M = 0.6;

/** Conservative pre-flight estimate before a caption / art-director chat call. */
export const CHAT_PREFLIGHT_USD = 0.0003;

/** Flat estimate per gpt-image generation (quality-dependent; medium default). */
export function imageGenerationEstimateUsd(): number {
  const quality = process.env["OPENAI_IMAGE_QUALITY"]?.trim() || "medium";
  if (quality === "low") return 0.011;
  if (quality === "high") return 0.17;
  return 0.04;
}

export function aiBudgetUsd(): number {
  const raw = process.env["AI_BUDGET_USD"];
  if (raw === undefined || raw === "") return 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

export function estimateChatCost(model: string, inputTokens: number, outputTokens: number): number {
  if (model.includes("gpt-4o-mini") || model.includes("gpt-4o")) {
    return (
      (inputTokens / 1_000_000) * GPT4O_MINI_INPUT_PER_1M +
      (outputTokens / 1_000_000) * GPT4O_MINI_OUTPUT_PER_1M
    );
  }
  return (inputTokens + outputTokens) / 1_000_000;
}

export function buildAiSpendSnapshot(
  records: readonly AiUsageRecord[],
  spendUsd: number,
): AiSpendSnapshot {
  const budgetUsd = aiBudgetUsd();
  const percentUsed = budgetUsd > 0 ? Math.min(100, (spendUsd / budgetUsd) * 100) : 100;
  const openAiConfigured = Boolean(process.env["OPENAI_API_KEY"]?.trim());
  const canSpendMore = openAiConfigured && spendUsd + CHAT_PREFLIGHT_USD <= budgetUsd + 1e-9;

  let status: AiSpendStatus;
  if (!openAiConfigured) status = "disabled";
  else if (!canSpendMore || spendUsd >= budgetUsd - 1e-9) status = "exhausted";
  else if (percentUsed >= 90) status = "critical";
  else if (percentUsed >= 70) status = "warning";
  else status = "ok";

  const recent = [...records]
    .reverse()
    .slice(0, 8)
    .map((row) => ({
      feature: row.feature,
      featureLabel: formatAiFeatureLabel(row.feature),
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      estimatedUsd: row.estimatedUsd,
      at: row.at,
    }));

  return {
    budgetUsd,
    spendUsd,
    percentUsed,
    callCount: records.length,
    openAiConfigured,
    canSpendMore,
    status,
    recent,
  };
}

export function createInMemoryAiCostMeter(): AiCostMeter & { reset(): void } {
  let spendUsd = 0;
  const records: AiUsageRecord[] = [];

  return {
    async canSpend(estimateUsd: number) {
      return spendUsd + estimateUsd <= aiBudgetUsd() + 1e-9;
    },
    async record(record) {
      spendUsd += record.estimatedUsd;
      const row: AiUsageRecord = { ...record, at: record.at ?? new Date().toISOString() };
      records.push(row);
      console.info(
        `[ai-cost] ${record.feature} ${record.model} ~$${record.estimatedUsd.toFixed(6)} ` +
          `(session $${spendUsd.toFixed(4)} / budget $${aiBudgetUsd().toFixed(2)})`,
      );
    },
    async getSnapshot() {
      return buildAiSpendSnapshot(records, spendUsd);
    },
    reset() {
      spendUsd = 0;
      records.length = 0;
    },
  };
}

const defaultTestMeter = createInMemoryAiCostMeter();

/** Shared in-memory meter for unit tests and direct adapter imports. */
export function getTestAiCostMeter(): AiCostMeter & { reset(): void } {
  return defaultTestMeter;
}

/** Vitest-only reset — keeps cost tests deterministic. */
export function resetAiCostMeterForTests(): void {
  defaultTestMeter.reset();
}
