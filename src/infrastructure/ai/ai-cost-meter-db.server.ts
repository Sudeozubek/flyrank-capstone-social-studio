/**
 * Database-backed AI cost meter — persists usage per authenticated user.
 */

import type { AiCostMeter, AiUsageRecord } from "@/domain/ports";
import {
  aiBudgetUsd,
  buildAiSpendSnapshot,
  CHAT_PREFLIGHT_USD,
  emptyAiSpendSnapshot,
} from "@/infrastructure/ai/ai-cost-meter.server";
import {
  createAiUsageRepository,
  type Db,
} from "@/infrastructure/persistence/supabase-repositories.server";

function persistenceUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("ai_usage_records") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function emptyLedger(): { spendUsd: number; recentRecords: AiUsageRecord[]; callCount: number } {
  return { spendUsd: 0, recentRecords: [], callCount: 0 };
}

export function createDbAiCostMeter(db: Db, userId: string): AiCostMeter {
  const repo = createAiUsageRepository(db, userId);
  let spendUsd: number | null = null;
  let recentRecords: AiUsageRecord[] | null = null;
  let callCount: number | null = null;
  let persistenceEnabled = true;

  async function ensureLoaded(): Promise<void> {
    if (!persistenceEnabled) return;
    if (spendUsd !== null && recentRecords !== null && callCount !== null) return;
    try {
      const [total, recent, count] = await Promise.all([
        repo.sumEstimatedUsd(),
        repo.listRecent(8),
        repo.count(),
      ]);
      spendUsd = total;
      recentRecords = recent;
      callCount = count;
    } catch (error) {
      if (!persistenceUnavailable(error)) throw error;
      console.warn(
        "[ai-cost] ai_usage_records unavailable — run supabase/migrations/20260807210000_add_ai_usage_records.sql. " +
          "Falling back to in-memory spend for this request.",
      );
      persistenceEnabled = false;
      ({ spendUsd, recentRecords, callCount } = emptyLedger());
    }
  }

  return {
    async canSpend(estimateUsd: number) {
      await ensureLoaded();
      return spendUsd! + estimateUsd <= aiBudgetUsd() + 1e-9;
    },
    async record(record) {
      if (!persistenceEnabled) {
        if (spendUsd === null) ({ spendUsd, recentRecords, callCount } = emptyLedger());
        const row: AiUsageRecord = { ...record, at: record.at ?? new Date().toISOString() };
        spendUsd! += row.estimatedUsd;
        callCount = (callCount ?? 0) + 1;
        recentRecords = [row, ...(recentRecords ?? [])].slice(0, 8);
        return;
      }

      try {
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
      } catch (error) {
        if (!persistenceUnavailable(error)) throw error;
        console.warn("[ai-cost] could not persist usage row; continuing without DB ledger.");
        persistenceEnabled = false;
        if (spendUsd === null) ({ spendUsd, recentRecords, callCount } = emptyLedger());
        const row: AiUsageRecord = { ...record, at: record.at ?? new Date().toISOString() };
        spendUsd! += row.estimatedUsd;
        callCount = (callCount ?? 0) + 1;
        recentRecords = [row, ...(recentRecords ?? [])].slice(0, 8);
      }
    },
    async getSnapshot() {
      try {
        await ensureLoaded();
        const snapshot = buildAiSpendSnapshot([...(recentRecords ?? [])].reverse(), spendUsd ?? 0);
        return {
          ...snapshot,
          callCount: callCount ?? snapshot.callCount,
          canSpendMore:
            snapshot.openAiConfigured &&
            (spendUsd ?? 0) + CHAT_PREFLIGHT_USD <= aiBudgetUsd() + 1e-9,
        };
      } catch (error) {
        if (!persistenceUnavailable(error)) throw error;
        console.warn("[ai-cost] returning empty spend snapshot because persistence is unavailable.");
        return emptyAiSpendSnapshot();
      }
    },
  };
}
