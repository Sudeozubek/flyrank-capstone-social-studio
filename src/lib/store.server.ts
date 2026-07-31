/**
 * Durable store.
 *
 * Backed by a JSON file on disk (`.data/flyrank.json`) with synchronous,
 * atomic-ish writes after every mutation. That is deliberately the smallest
 * thing that satisfies the requirement — "queue table + status column" — while
 * surviving a worker crash: state is on disk, not in process memory only.
 * Swapping this module for SQLite/Postgres is a single-file change.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import type { BlogPost, SocialPostEntry, WebhookLogEntry, WorkerLogEntry } from "./types";
import { encryptToken } from "./crypto.server";

export interface PlatformCredential {
  platform: string;
  /** Encrypted at rest — never stored or logged in plaintext. */
  accessTokenEncrypted: string;
  issuedAt: string;
  expiresAt: string;
}

export interface FakePlatformPost {
  id: string;
  platform: string;
  idempotencyKey: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
}

export interface StoreShape {
  posts: BlogPost[];
  entries: SocialPostEntry[];
  credentials: PlatformCredential[];
  webhookLog: WebhookLogEntry[];
  workerLog: WorkerLogEntry[];
  /** Fake platform state. */
  platformPosts: FakePlatformPost[];
  /** Number of upcoming publish calls the fake platform should reject with 429. */
  force429: number;
  /** Dev clock offset in ms, applied to every scheduling decision. */
  clockOffsetMs: number;
}

const DB_PATH = resolve(process.cwd(), ".data/flyrank.json");

const SEED_POSTS: BlogPost[] = [
  {
    id: "post_pipeline",
    title: "Building a crash-safe publishing worker",
    body:
      "Scheduling is the easy part; surviving a restart is not. We give every queued row a short lease and a status column, so a worker that dies mid-batch leaves behind claims that expire instead of ghosts. On restart the worker reclaims expired leases and replays them. Because every publish carries an idempotency key, a replay is a no-op on the platform side rather than a duplicate post. The result is a queue you can kill at any moment without apologising to anyone's timeline.",
    url: "https://flyrank.example/blog/crash-safe-worker",
    createdAt: new Date("2026-07-02T09:00:00Z").toISOString(),
  },
  {
    id: "post_variants",
    title: "One source image, every aspect ratio",
    body:
      "A 1:1 square and a 16:9 banner are not the same picture cropped twice. We compute a cover crop per platform, then translate it so the subject box lands inside a configured safe zone. Overlays sit in the corner the platform does not cover with its own chrome. Every step is pure geometry, so a unit test can assert exact output dimensions instead of eyeballing a screenshot.",
    url: "https://flyrank.example/blog/image-variants",
    createdAt: new Date("2026-07-14T09:00:00Z").toISOString(),
  },
  {
    id: "post_voice",
    title: "Captions that do not read like a mail merge",
    body:
      "Shipping the same sentence to five networks is how a brand starts sounding like a bot. We keep a shared voice file and per-platform overrides: tone, template, hashtag budget, target length. X gets one idea and a link. Instagram gets a hook, a story and room to breathe. The composer assembles fragments rather than truncating a master string, so the outputs differ structurally, not just in length.",
    url: "https://flyrank.example/blog/caption-composer",
    createdAt: new Date("2026-07-24T09:00:00Z").toISOString(),
  },
];

function emptyStore(): StoreShape {
  return {
    posts: SEED_POSTS,
    entries: [],
    credentials: [],
    webhookLog: [],
    workerLog: [],
    platformPosts: [],
    force429: 0,
    clockOffsetMs: 0,
  };
}

let cache: StoreShape | null = null;

function load(): StoreShape {
  if (cache) return cache;
  try {
    if (existsSync(DB_PATH)) {
      cache = { ...emptyStore(), ...(JSON.parse(readFileSync(DB_PATH, "utf8")) as StoreShape) };
      return cache;
    }
  } catch {
    // Corrupt file — start clean rather than crash the server.
  }
  cache = emptyStore();
  persist();
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(cache, null, 2), "utf8");
    renameSync(tmp, DB_PATH);
  } catch {
    // Read-only FS (edge runtime): the in-memory cache still serves the process.
  }
}

export function db(): StoreShape {
  return load();
}

export function mutate<T>(fn: (state: StoreShape) => T): T {
  const state = load();
  const result = fn(state);
  persist();
  return result;
}

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

/** Dev clock: `now()` everywhere in the scheduler goes through this. */
export function now(): Date {
  return new Date(Date.now() + db().clockOffsetMs);
}

export function logWorker(level: WorkerLogEntry["level"], message: string) {
  mutate((s) => {
    s.workerLog.unshift({ id: newId("wl"), at: now().toISOString(), level, message });
    s.workerLog = s.workerLog.slice(0, 100);
  });
}

export function logWebhook(entry: Omit<WebhookLogEntry, "id" | "receivedAt">) {
  mutate((s) => {
    s.webhookLog.unshift({ ...entry, id: newId("wh"), receivedAt: now().toISOString() });
    s.webhookLog = s.webhookLog.slice(0, 100);
  });
}

/** Issues (and caches) an encrypted OAuth token for a platform. */
export function saveCredential(platform: string, accessToken: string, expiresInSec: number) {
  mutate((s) => {
    const record: PlatformCredential = {
      platform,
      accessTokenEncrypted: encryptToken(accessToken),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
    };
    const idx = s.credentials.findIndex((c) => c.platform === platform);
    if (idx >= 0) s.credentials[idx] = record;
    else s.credentials.push(record);
  });
}

export function getCredential(platform: string): PlatformCredential | undefined {
  return db().credentials.find((c) => c.platform === platform);
}

export function resetStore() {
  cache = emptyStore();
  persist();
}
