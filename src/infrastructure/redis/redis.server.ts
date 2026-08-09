/**
 * Optional Redis client for distributed fake-platform rate limits and health probes.
 * When REDIS_URL is unset the app falls back to in-process maps.
 */

import Redis from "ioredis";

let client: Redis | undefined;

export function getRedis(): Redis | undefined {
  const url = process.env["REDIS_URL"]?.trim();
  if (!url) return undefined;
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return client;
}

export async function redisHealth(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (redis.status === "wait") await redis.connect();
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}

const RATE_PREFIX = "flyrank:rate:";

export async function readRateLimitBudget(platform: string): Promise<number | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  const raw = await redis.get(`${RATE_PREFIX}${platform}`);
  if (raw === null) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function writeRateLimitBudget(platform: string, failures: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`${RATE_PREFIX}${platform}`, String(failures));
}

export async function decrementRateLimitBudget(platform: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  const next = await redis.decr(`${RATE_PREFIX}${platform}`);
  return next < 0 ? 0 : next;
}
