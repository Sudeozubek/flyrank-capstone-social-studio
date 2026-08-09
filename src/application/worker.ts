/**
 * Durable worker use cases. Claiming rows from Postgres lives in infrastructure;
 * this module only orchestrates publish attempts for already-claimed entries.
 */

import type { SocialPostEntry } from "@/domain/entities";
import { deriveCampaignStatus } from "@/domain/entities";
import type { AppContext } from "@/domain/ports";
import { attemptEntry } from "./publish-usecases";

export interface TickResult {
  claimed: number;
  processed: Array<{ entryId: string; platform: string; status: string }>;
}

export async function processClaimedEntries(
  context: AppContext,
  claimed: SocialPostEntry[],
): Promise<TickResult> {
  const processed: TickResult["processed"] = [];
  const touchedCampaigns = new Set<string>();

  for (const entry of claimed) {
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

export async function processClaimedEntriesGlobal(
  createContext: (userId: string) => AppContext,
  claimed: SocialPostEntry[],
): Promise<TickResult> {
  const processed: TickResult["processed"] = [];
  const touchedCampaigns = new Set<string>();

  for (const entry of claimed) {
    const context = createContext(entry.userId);
    const result = await attemptEntry(context, { ...entry, leaseUntil: null });
    processed.push({ entryId: result.id, platform: result.platform, status: result.status });
    touchedCampaigns.add(result.campaignId);
  }

  for (const campaignId of touchedCampaigns) {
    const first = claimed.find((e) => e.campaignId === campaignId);
    if (!first) continue;
    const context = createContext(first.userId);
    const entries = await context.entries.listByCampaign(campaignId);
    await context.campaigns.update(campaignId, { status: deriveCampaignStatus(entries) });
  }

  return { claimed: claimed.length, processed };
}
