/**
 * Database-backed AI cost meter — persists usage per authenticated user.
 */

import type { AiCostMeter, AiUsageRecord } from "@/domain/ports";
import {
  aiBudgetUsd,
  buildAiSpendSnapshot,
  CHAT_PREFLIGHT_USD,
} from "@/infrastructure/ai/ai-cost-meter.server";
import {
  createAiUsageRepository,
  type Db,
} from "@/infrastructure/persistence/supabase-repositories.server";

export function createDbAiCostMeter(db: Db, userId: string): AiCostMeter {
  const repo = createAiUsageRepository(db, userId);
  let spendUsd: number | null = null;
  let recentRecords: AiUsageRecord[] | null = null;
  let callCount: number | null = null;

  async function ensureLoaded(): Promise<void> {
    if (spendUsd !== null && recentRecords !== null && callCount !== null) return;
    const [total, recent, count] = await Promise.all([
      repo.sumEstimatedUsd(),
      repo.listRecent(8),
      repo.count(),
    ]);
    spendUsd = total;
    recentRecords = recent;
    callCount = count;
  }

  return {
    async canSpend(estimateUsd: number) {
      await ensureLoaded();
      return spendUsd! + estimateUsd <= aiBudgetUsd() + 1e-9;
    },
    async record(record) {
      const row = await repo.insert(record);
      if (spendUsd === null) {
        await ensureLoaded();
      }
      spendUsd! += row.estimatedUsd;
      callCount = (callCount ?? 0) + 1;
      recentRecords = [row, ...(recentRecords ?? [])].slice(0, 8);
      console.info(
        `[ai-cost] ${record.feature} ${record.model} ~$${record.estimatedUsd.toFixed(6)} ` +
          `(user $${spendUsd!.toFixed(4)} / budget $${aiBudgetUsd().toFixed(2)})`,
      );
    },
    async getSnapshot() {
      await ensureLoaded();
      const snapshot = buildAiSpendSnapshot([...(recentRecords ?? [])].reverse(), spendUsd ?? 0);
      return {
        ...snapshot,
        callCount: callCount ?? snapshot.callCount,
        canSpendMore:
          snapshot.openAiConfigured &&
          (spendUsd ?? 0) + CHAT_PREFLIGHT_USD <= aiBudgetUsd() + 1e-9,
      };
    },
  };
}
