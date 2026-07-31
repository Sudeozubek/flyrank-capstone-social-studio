/**
 * Durable worker. Survives process death because all state lives in Postgres:
 * due entries are claimed with a lease (`claim_due_entries`, FOR UPDATE SKIP
 * LOCKED), so a crashed worker's rows become claimable again once the lease
 * expires, and the deterministic idempotency key prevents a double post.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deriveCampaignStatus } from "@/domain/entities";
import { attemptEntry, LEASE_SECONDS } from "./publish-usecases";
import { createAppContext } from "@/infrastructure/context.server";
import { toEntry } from "@/infrastructure/persistence/supabase-repositories.server";

export interface TickResult {
  claimed: number;
  processed: Array<{ entryId: string; platform: string; status: string }>;
}

/**
 * One worker tick. `db` must be a client that can see the rows it claims
 * (the authenticated user's client for in-app ticks).
 */
export async function runWorkerTick(
  db: SupabaseClient<Database>,
  userId: string,
  options: { requestUrl?: string; limit?: number } = {},
): Promise<TickResult> {
  const { data, error } = await db.rpc("claim_due_entries", {
    p_limit: options.limit ?? 10,
    p_lease_seconds: LEASE_SECONDS,
  });
  if (error) throw new Error(`claim_due_entries: ${error.message}`);

  const claimed = (data ?? []).map(toEntry);
  const context = createAppContext(db, userId, {
    ...(options.requestUrl ? { requestUrl: options.requestUrl } : {}),
  });
  const processed: TickResult["processed"] = [];
  const touchedCampaigns = new Set<string>();

  for (const entry of claimed) {
    // The lease is already held; attemptEntry refreshes it and records the try.
    const result = await attemptEntry(context, { ...entry, leaseUntil: null });
    processed.push({ entryId: result.id, platform: result.platform, status: result.status });
    touchedCampaigns.add(result.campaignId);
  }

  for (const campaignId of touchedCampaigns) {
    const entries = await context.entries.listByCampaign(campaignId);
    await context.campaigns.update(campaignId, { status: deriveCampaignStatus(entries) });
  }

  return { claimed: claimed.length, processed };
}
