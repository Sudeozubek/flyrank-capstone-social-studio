/**
 * Use cases: scheduling and publishing.
 *
 * Rules enforced here (PDF §publish flow):
 *  - a deterministic Idempotency-Key is sent on every attempt, so retries and
 *    duplicate worker leases never create a second remote post;
 *  - HTTP 429 is not a failure: it schedules the next attempt using
 *    Retry-After (falling back to exponential backoff);
 *  - the entry stays `publishing` after acceptance — only the signed delivery
 *    webhook writes the terminal `published` status.
 */

import {
  MAX_PUBLISH_ATTEMPTS,
  backoffSeconds,
  deriveCampaignStatus,
  type SocialPostEntry,
} from "@/domain/entities";
import type { AppContext, PublishResult } from "@/domain/ports";
import { requireCampaign } from "./campaign-usecases";

export const LEASE_SECONDS = 60;

export async function scheduleCampaign(
  context: AppContext,
  input: { campaignId: string; scheduledFor: string },
): Promise<SocialPostEntry[]> {
  const campaign = await requireCampaign(context, input.campaignId);
  const when = new Date(input.scheduledFor);
  if (Number.isNaN(when.getTime())) throw new Error("scheduledFor must be an ISO timestamp");

  const entries = await context.entries.listByCampaign(campaign.id);
  if (entries.length === 0) throw new Error("Campaign has no entries to schedule");

  const updated: SocialPostEntry[] = [];
  for (const entry of entries) {
    if (entry.status === "published") {
      updated.push(entry);
      continue;
    }
    updated.push(
      await context.entries.update(entry.id, {
        status: "queued",
        scheduledFor: when.toISOString(),
        nextAttemptAt: when.toISOString(),
        leaseUntil: null,
        error: null,
      }),
    );
  }

  await context.campaigns.update(campaign.id, {
    status: "scheduled",
    scheduledFor: when.toISOString(),
  });
  return updated;
}

/** Publish now: schedules everything at the current instant and drains it. */
export async function publishCampaign(
  context: AppContext,
  campaignId: string,
): Promise<SocialPostEntry[]> {
  await scheduleCampaign(context, {
    campaignId,
    scheduledFor: context.clock.now().toISOString(),
  });
  return drainCampaign(context, campaignId);
}

/** Re-arms failed entries for another pass; published ones are left alone. */
export async function retryCampaign(
  context: AppContext,
  campaignId: string,
): Promise<SocialPostEntry[]> {
  const entries = await context.entries.listByCampaign(campaignId);
  const now = context.clock.now().toISOString();
  const updated: SocialPostEntry[] = [];
  for (const entry of entries) {
    if (entry.status === "published") {
      updated.push(entry);
      continue;
    }
    updated.push(
      await context.entries.update(entry.id, {
        status: "queued",
        attempts: 0,
        error: null,
        leaseUntil: null,
        nextAttemptAt: now,
      }),
    );
  }
  await context.campaigns.update(campaignId, { status: "scheduled" });
  return drainCampaign(context, campaignId);
}

/** Attempts every entry of one campaign that is due right now. */
export async function drainCampaign(
  context: AppContext,
  campaignId: string,
): Promise<SocialPostEntry[]> {
  const entries = await context.entries.listByCampaign(campaignId);
  const results: SocialPostEntry[] = [];
  for (const entry of entries) {
    results.push(isDue(entry, context.clock.now()) ? await attemptEntry(context, entry) : entry);
  }
  await context.campaigns.update(campaignId, { status: deriveCampaignStatus(results) });
  return results;
}

export function isDue(entry: SocialPostEntry, now: Date): boolean {
  if (entry.status === "published") return false;
  if (entry.attempts >= MAX_PUBLISH_ATTEMPTS && entry.status === "failed") return false;
  const due = entry.nextAttemptAt ?? entry.scheduledFor;
  if (!due) return false;
  if (entry.leaseUntil && new Date(entry.leaseUntil).getTime() > now.getTime()) return false;
  return new Date(due).getTime() <= now.getTime();
}

/**
 * One publish attempt for one entry. Every branch is recorded in
 * publish_attempts, which is what makes crash recovery auditable.
 */
export async function attemptEntry(
  context: AppContext,
  entry: SocialPostEntry,
): Promise<SocialPostEntry> {
  const now = context.clock.now();
  const attemptNo = entry.attempts + 1;

  // Lease first: a concurrent worker that reads this row will skip it.
  const leased = await context.entries.update(entry.id, {
    status: "publishing",
    attempts: attemptNo,
    leaseUntil: new Date(now.getTime() + LEASE_SECONDS * 1000).toISOString(),
  });

  if (!leased.imagePath) {
    await context.attempts.record({
      entryId: entry.id,
      attemptNo,
      outcome: "failed",
      detail: "image variant missing",
    });
    return context.entries.update(entry.id, {
      status: "failed",
      error: "Image variant has not been generated yet",
      leaseUntil: null,
    });
  }

  let result: PublishResult;
  try {
    const publisher = context.publisherFor(entry.platform);
    result = await publisher.publish(
      {
        campaignId: entry.campaignId,
        entryId: entry.id,
        userId: context.userId,
        platform: entry.platform,
        caption: leased.caption,
        imageRef: leased.imagePath,
      },
      entry.idempotencyKey,
    );
  } catch (error) {
    result = {
      outcome: "failed",
      error: error instanceof Error ? error.message : "transport error",
    };
  }

  await context.attempts.record({
    entryId: entry.id,
    attemptNo,
    httpStatus: result.httpStatus ?? null,
    retryAfterSec: result.retryAfterSec ?? null,
    outcome: result.outcome,
    detail: result.error ?? result.remoteId ?? null,
  });

  if (result.outcome === "rate_limited") {
    const delay = backoffSeconds(attemptNo, result.retryAfterSec);
    return context.entries.update(entry.id, {
      status: "queued",
      leaseUntil: null,
      nextAttemptAt: new Date(now.getTime() + delay * 1000).toISOString(),
      error: `Rate limited — retrying in ${delay}s`,
    });
  }

  if (result.outcome === "accepted" || result.outcome === "duplicate") {
    // Terminal `published` is intentionally NOT written here: the platform
    // confirms delivery through the signed webhook.
    return context.entries.update(entry.id, {
      status: "publishing",
      remoteId: result.remoteId ?? null,
      leaseUntil: null,
      error: null,
      nextAttemptAt: null,
    });
  }

  const exhausted = attemptNo >= MAX_PUBLISH_ATTEMPTS;
  const delay = backoffSeconds(attemptNo);
  return context.entries.update(entry.id, {
    status: exhausted ? "failed" : "queued",
    leaseUntil: null,
    error: result.error ?? "Publish failed",
    nextAttemptAt: exhausted ? null : new Date(now.getTime() + delay * 1000).toISOString(),
  });
}
