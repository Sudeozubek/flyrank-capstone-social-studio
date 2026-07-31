/**
 * Use case: apply a signed delivery webhook.
 *
 * The webhook is the ONLY writer of terminal entry status. Signature
 * verification happens in the interface layer; this function assumes an
 * already-verified payload and is safe to call repeatedly (idempotent).
 */

import { deriveCampaignStatus, type SocialPostEntry } from "@/domain/entities";
import type { AppContext } from "@/domain/ports";

export interface DeliveryPayload {
  entryId: string;
  platform: string;
  remoteId: string;
  status: "delivered" | "rejected";
  reason?: string;
}

export async function applyDelivery(
  context: AppContext,
  payload: DeliveryPayload,
): Promise<SocialPostEntry | null> {
  const entry = await context.entries.findById(payload.entryId);
  if (!entry) return null;

  const now = context.clock.now().toISOString();
  const updated =
    payload.status === "delivered"
      ? await context.entries.update(entry.id, {
          status: "published",
          remoteId: payload.remoteId,
          publishedAt: entry.publishedAt ?? now,
          leaseUntil: null,
          nextAttemptAt: null,
          error: null,
        })
      : await context.entries.update(entry.id, {
          status: "failed",
          leaseUntil: null,
          nextAttemptAt: null,
          error: payload.reason ?? "Platform rejected the post",
        });

  const siblings = await context.entries.listByCampaign(entry.campaignId);
  await context.campaigns.update(entry.campaignId, { status: deriveCampaignStatus(siblings) });
  return updated;
}
