/**
 * Fake-platform transport. The ONLY module allowed to perform network calls
 * to a platform. Points exclusively at the in-repo `/api/public/fake-platform`
 * server — no real social API domain appears anywhere in this repo.
 */

import type { Platform } from "@/config/platform-specs";
import { getCredential, saveCredential } from "@/lib/store.server";
import { decryptToken } from "@/lib/crypto.server";
import type { PublishInput, PublishResult, SocialPublisher } from "../types";

export function baseUrl(): string {
  return process.env["PUBLIC_BASE_URL"] ?? "http://localhost:8080";
}

/** OAuth client-credentials exchange against the fake platform. */
async function getAccessToken(platform: Platform): Promise<string> {
  const existing = getCredential(platform);
  if (existing && new Date(existing.expiresAt).getTime() > Date.now() + 30_000) {
    return decryptToken(existing.accessTokenEncrypted);
  }

  const res = await fetch(`${baseUrl()}/api/public/fake-platform/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      platform,
      client_id: process.env[`${platform.toUpperCase()}_CLIENT_ID`] ?? "dev-client-id",
      client_secret: process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] ?? "dev-client-secret",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`OAuth failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  // Stored encrypted at rest, with a fresh random IV on every write.
  saveCredential(platform, json.access_token, json.expires_in);
  return json.access_token;
}

export interface AdapterOptions {
  /** Max attempts including the first. */
  maxAttempts?: number;
  /** Overridable for tests so backoff does not slow the suite. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class FakePlatformAdapter implements SocialPublisher {
  constructor(
    readonly platform: Platform,
    private readonly options: AdapterOptions = {},
  ) {}

  /** Platform-specific payload shaping lives in the adapter, not in app code. */
  protected buildPayload(post: PublishInput, caption: string) {
    return { caption, image_url: post.imageUrl };
  }

  async publish(post: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    const maxAttempts = this.options.maxAttempts ?? 4;
    const sleep = this.options.sleep ?? defaultSleep;
    let lastError = "unknown error";
    let retryAfterSec: number | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const token = await getAccessToken(this.platform);
        const res = await fetch(`${baseUrl()}/api/public/fake-platform/publish`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            platform: this.platform,
            post_id: post.postId,
            entry_id: post.entryId,
            ...this.buildPayload(post, post.caption),
          }),
        });

        if (res.status === 429) {
          retryAfterSec = Number(res.headers.get("retry-after") ?? 1);
          lastError = `rate limited, retry after ${retryAfterSec}s`;
          if (attempt === maxAttempts) break;
          // Honour the server-directed delay, with exponential growth as a floor.
          await sleep(Math.max(retryAfterSec * 1000, 2 ** attempt * 100));
          continue;
        }

        if (!res.ok) {
          lastError = `publish failed [${res.status}]: ${await res.text()}`;
          if (attempt === maxAttempts) break;
          await sleep(2 ** attempt * 100);
          continue;
        }

        const json = (await res.json()) as { id: string; duplicate: boolean };
        return {
          outcome: json.duplicate ? "duplicate" : "accepted",
          remoteId: json.id,
          attempts: attempt,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt === maxAttempts) break;
        await sleep(2 ** attempt * 100);
      }
    }

    return {
      outcome: retryAfterSec ? "rate_limited" : "failed",
      error: lastError,
      ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
      attempts: maxAttempts,
    };
  }
}
