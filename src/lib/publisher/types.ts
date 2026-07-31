/**
 * Wk3 — the one interface the application depends on.
 *
 * BOUNDARY RULE: business logic (campaign service, worker, API routes, UI)
 * imports `SocialPublisher` and `getPublisher()` ONLY. No module outside
 * `src/lib/publisher/adapters/` may talk to a platform transport — fake or real.
 */

import type { Platform } from "@/config/platform-specs";

export interface PublishInput {
  postId: string;
  entryId: string;
  platform: Platform;
  caption: string;
  imageUrl: string;
}

export type PublishOutcome = "accepted" | "duplicate" | "rate_limited" | "failed";

export interface PublishResult {
  outcome: PublishOutcome;
  /** Remote id on the platform; present for accepted + duplicate. */
  remoteId?: string;
  /** Seconds to wait, from the platform's Retry-After, when rate limited. */
  retryAfterSec?: number;
  error?: string;
  attempts: number;
}

export interface SocialPublisher {
  readonly platform: Platform;
  publish(post: PublishInput, idempotencyKey: string): Promise<PublishResult>;
}
