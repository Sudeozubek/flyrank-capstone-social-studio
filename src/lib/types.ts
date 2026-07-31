/**
 * Shared domain types (Wk3 data model).
 * `SocialPostEntry` mirrors the spec; `ContentSocials` is the per-post rollup.
 */

import type { Platform } from "@/config/platform-specs";

export type PostStatus = "queued" | "publishing" | "published" | "failed";

export interface BlogPost {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
}

export interface SocialPostEntry {
  id: string;
  postId: string;
  platform: Platform;
  caption: string;
  imageUrl: string;
  status: PostStatus;
  scheduledFor?: string;
  idempotencyKey: string;
  publishedAt?: string;
  error?: string;
  /** Worker lease — enables crash-safe resume without double-posting. */
  leaseUntil?: string;
  attempts: number;
  /** Remote id returned by the (fake) platform. */
  remoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSocials {
  post: BlogPost;
  entries: SocialPostEntry[];
}

export interface WebhookLogEntry {
  id: string;
  postId: string;
  entryId?: string;
  platform?: Platform;
  receivedAt: string;
  verified: boolean;
  status: number;
  message: string;
}

export interface WorkerLogEntry {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  message: string;
}
