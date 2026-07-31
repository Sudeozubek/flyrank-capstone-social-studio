/**
 * Domain entities — pure data shapes. No I/O, no framework, no SDK types.
 */

export const PLATFORMS = ["instagram", "x"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export type PostSource = "paste" | "markdown" | "pdf" | "docx" | "seed";
export type CampaignStatus = "draft" | "scheduled" | "publishing" | "completed" | "failed";
export type EntryStatus = "queued" | "publishing" | "published" | "failed";

export interface BlogPost {
  id: string;
  userId: string;
  title: string;
  body: string;
  url: string | null;
  source: PostSource;
  createdAt: string;
}

/** Optional, caption-only tenant context. Never affects publishing behaviour. */
export interface BrandContext {
  name?: string | null;
  tone?: string | null;
}

export interface Campaign {
  id: string;
  userId: string;
  postId: string;
  name: string;
  status: CampaignStatus;
  scheduledFor: string | null;
  brandName: string | null;
  brandTone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostEntry {
  id: string;
  userId: string;
  campaignId: string;
  platform: Platform;
  caption: string;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  status: EntryStatus;
  scheduledFor: string | null;
  idempotencyKey: string;
  attempts: number;
  leaseUntil: string | null;
  nextAttemptAt: string | null;
  remoteId: string | null;
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformCredential {
  userId: string;
  platform: Platform;
  accessTokenCiphertext: string;
  expiresAt: string;
}

export interface PublishAttempt {
  id: string;
  entryId: string;
  attemptNo: number;
  httpStatus: number | null;
  retryAfterSec: number | null;
  outcome: string;
  detail: string | null;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  entryId: string | null;
  platform: Platform | null;
  signatureValid: boolean;
  httpStatus: number;
  payloadDigest: string;
  message: string | null;
  receivedAt: string;
}

export interface CampaignSnapshot {
  campaign: Campaign;
  post: BlogPost;
  entries: SocialPostEntry[];
}

/**
 * Deterministic idempotency key. Stable across retries, worker restarts and
 * process crashes — the platform therefore collapses replays into one post.
 */
export function buildIdempotencyKey(campaignId: string, platform: Platform): string {
  return `flyrank:${campaignId}:${platform}`;
}

/** Terminal campaign status derived from its entries (pure). */
export function deriveCampaignStatus(entries: readonly SocialPostEntry[]): CampaignStatus {
  if (entries.length === 0) return "draft";
  if (entries.every((e) => e.status === "published")) return "completed";
  if (entries.some((e) => e.status === "publishing")) return "publishing";
  if (entries.every((e) => e.status === "failed")) return "failed";
  return "scheduled";
}

/** Exponential backoff floor, honouring a platform-supplied Retry-After. */
export function backoffSeconds(attempt: number, retryAfterSec?: number): number {
  const exponential = Math.min(300, 2 ** Math.max(0, attempt - 1) * 5);
  return Math.max(exponential, retryAfterSec ?? 0);
}

export const MAX_PUBLISH_ATTEMPTS = 5;
