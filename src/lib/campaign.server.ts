/**
 * Campaign service — business logic. Depends on `SocialPublisher` only.
 */

import { PLATFORMS, type Platform } from "@/config/platform-specs";
import { composeCaption } from "./captions";
import { variantImageUrl } from "./image-variants";
import { getPublisher } from "./publisher";
import { db, logWorker, mutate, newId, now } from "./store.server";
import type { BlogPost, ContentSocials, SocialPostEntry } from "./types";

export const LEASE_MS = 30_000;
export const MAX_ATTEMPTS = 3;

export function listPosts(): BlogPost[] {
  return db().posts;
}

export function getPost(postId: string): BlogPost | undefined {
  return db().posts.find((p) => p.id === postId);
}


/** Deterministic per (post, platform) — the guarantee behind idempotent publish. */
export function idempotencyKeyFor(postId: string, platform: Platform): string {
  return `flyrank:${postId}:${platform}`;
}

export function previewCampaign(post: BlogPost) {
  return PLATFORMS.map((platform) => ({
    platform,
    caption: composeCaption(post, platform),
    imageUrl: variantImageUrl(post.id, platform, post.title),
  }));
}

export interface CreateCampaignInput {
  postId: string;
  platforms?: Platform[] | undefined;
  /** ISO date; when omitted the entries are due immediately. */
  scheduledFor?: string | undefined;
}

export function createCampaign(input: CreateCampaignInput): ContentSocials {
  const post = getPost(input.postId);
  if (!post) throw new Error(`Unknown post: ${input.postId}`);
  const platforms = input.platforms?.length ? input.platforms : [...PLATFORMS];

  return mutate((s) => {
    for (const platform of platforms) {
      const idempotencyKey = idempotencyKeyFor(post.id, platform);
      const existing = s.entries.find((e) => e.idempotencyKey === idempotencyKey);
      const nowIso = now().toISOString();

      if (existing) {
        // Re-running "Make campaign" refreshes content but never duplicates the row.
        if (existing.status === "published" || existing.status === "publishing") continue;
        existing.caption = composeCaption(post, platform);
        existing.imageUrl = variantImageUrl(post.id, platform, post.title);
        existing.status = "queued";
        delete existing.error;
        if (input.scheduledFor) existing.scheduledFor = input.scheduledFor;
        else delete existing.scheduledFor;
        existing.updatedAt = nowIso;
        continue;
      }

      const entry: SocialPostEntry = {
        id: newId("spe"),
        postId: post.id,
        platform,
        caption: composeCaption(post, platform),
        imageUrl: variantImageUrl(post.id, platform, post.title),
        status: "queued",
        idempotencyKey,
        attempts: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
      };
      s.entries.push(entry);
    }

    return { post, entries: s.entries.filter((e) => e.postId === post.id) };
  });
}

export function getCampaign(postId: string): ContentSocials | undefined {
  const post = getPost(postId);
  if (!post) return undefined;
  return { post, entries: db().entries.filter((e) => e.postId === postId) };
}

export function listCampaigns(): ContentSocials[] {
  const state = db();
  const ids = [...new Set(state.entries.map((e) => e.postId))];
  return ids
    .map((id) => getCampaign(id))
    .filter((c): c is ContentSocials => Boolean(c))
    .sort((a, b) => (a.post.createdAt < b.post.createdAt ? 1 : -1));
}

/** Rows that are due and unclaimed (or whose lease has expired after a crash). */
export function dueEntries(at: Date = now()): SocialPostEntry[] {
  return db().entries.filter((e) => {
    if (e.status === "published" || e.status === "failed") return false;
    if (e.status === "publishing") return !e.leaseUntil || new Date(e.leaseUntil) <= at;
    return !e.scheduledFor || new Date(e.scheduledFor) <= at;
  });
}

/** Atomically claim a row for this worker tick. Single-writer store => safe. */
export function claim(entryId: string, at: Date = now()): SocialPostEntry | undefined {
  return mutate((s) => {
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry) return undefined;
    if (entry.status === "published" || entry.status === "failed") return undefined;
    if (entry.status === "publishing" && entry.leaseUntil && new Date(entry.leaseUntil) > at) {
      return undefined;
    }
    entry.status = "publishing";
    entry.leaseUntil = new Date(at.getTime() + LEASE_MS).toISOString();
    entry.attempts += 1;
    entry.updatedAt = at.toISOString();
    return { ...entry };
  });
}

export interface PublishOptions {
  sleep?: (ms: number) => Promise<void>;
  maxAttempts?: number;
}

/**
 * Publish one claimed entry. The entry is NOT flipped to `published` here —
 * that transition is owned exclusively by the signed delivery webhook.
 */
export async function publishEntry(entry: SocialPostEntry, options: PublishOptions = {}) {
  const publisher = getPublisher(entry.platform, options);
  const result = await publisher.publish(
    {
      postId: entry.postId,
      entryId: entry.id,
      platform: entry.platform,
      caption: entry.caption,
      imageUrl: entry.imageUrl,
    },
    entry.idempotencyKey,
  );

  mutate((s) => {
    const row = s.entries.find((e) => e.id === entry.id);
    if (!row) return;
    row.updatedAt = now().toISOString();

    if (result.outcome === "accepted" || result.outcome === "duplicate") {
      row.remoteId = result.remoteId!;
      delete row.error;
      // Stays `publishing` until the delivery webhook arrives.
      row.leaseUntil = new Date(now().getTime() + LEASE_MS).toISOString();
      return;
    }

    if (result.outcome === "rate_limited") {
      row.status = "queued";
      row.error = result.error ?? "rate limited";
      delete row.leaseUntil;
      row.scheduledFor = new Date(now().getTime() + (result.retryAfterSec ?? 1) * 1000).toISOString();
      return;
    }

    row.error = result.error ?? "publish failed";
    if (row.attempts >= MAX_ATTEMPTS) {
      // Terminal transport failure: the platform never accepted the post, so no
      // delivery webhook will ever arrive to close the row out.
      row.status = "failed";
      delete row.leaseUntil;
    } else {
      row.status = "queued";
      delete row.leaseUntil;
      row.scheduledFor = new Date(now().getTime() + 2 ** row.attempts * 1000).toISOString();
    }
  });

  logWorker(
    result.outcome === "failed" ? "error" : result.outcome === "rate_limited" ? "warn" : "info",
    `${entry.platform} ${entry.postId}: ${result.outcome}${
      result.retryAfterSec ? ` (retry-after ${result.retryAfterSec}s)` : ""
    }${result.error ? ` — ${result.error}` : ""} [attempt ${result.attempts}]`,
  );

  return result;
}
