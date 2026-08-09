/**
 * Composition root. Builds an AppContext from a request-scoped Supabase
 * client; this is the only place concrete adapters are wired to ports.
 */

import type { Platform } from "@/domain/entities";
import type { AppContext, Clock } from "@/domain/ports";
import { createDbAiCostMeter } from "@/infrastructure/ai/ai-cost-meter-db.server";
import { createOpenAiCaptionWriter } from "@/infrastructure/ai/openai-caption-writer.server";
import { tokenCipher } from "@/infrastructure/crypto/token-cipher.server";

import { createAiImageRenderer } from "@/infrastructure/imaging/ai-image-renderer.server";
import { svgImageRenderer } from "@/infrastructure/imaging/renderers.server";
import { documentParser } from "@/infrastructure/parsing/document-parser.server";
import {
  createAttemptRepository,
  createCampaignRepository,
  createCredentialRepository,
  createEntryRepository,
  createPostRepository,
  createWebhookEventRepository,
  type Db,
} from "@/infrastructure/persistence/supabase-repositories.server";
import { createPublisher } from "@/infrastructure/publishing/adapters.server";
import {
  createFakePlatformTransport,
  resolveFakePlatformBaseUrl,
} from "@/infrastructure/publishing/fake-platform-transport.server";
import { createImageStore } from "@/infrastructure/storage/image-store.server";

export const systemClock: Clock = { now: () => new Date() };

/**
 * Development fallback token. Real deployments store a per-user OAuth token
 * encrypted at rest; this keeps the fake platform usable before any connect
 * flow has run, and it is encrypted through the exact same cipher.
 */
function devCiphertext(userId: string, platform: Platform): string {
  return tokenCipher.encrypt(`fake-oauth-token:${platform}:${userId}`);
}

export interface ContextOptions {
  requestUrl?: string;
  clock?: Clock;
}

export function createAppContext(db: Db, userId: string, options: ContextOptions = {}): AppContext {
  const transport = createFakePlatformTransport(resolveFakePlatformBaseUrl(options.requestUrl));
  const credentials = createCredentialRepository(db, userId);
  const cipherCache = new Map<Platform, string>();
  const aiCostMeter = createDbAiCostMeter(db, userId);

  return {
    userId,
    clock: options.clock ?? systemClock,
    posts: createPostRepository(db, userId),
    campaigns: createCampaignRepository(db, userId),
    entries: createEntryRepository(db, userId),
    credentials,
    attempts: createAttemptRepository(db, userId),
    webhooks: createWebhookEventRepository(db, userId),
    aiCostMeter,
    images: createImageStore(db),
    renderer: createAiImageRenderer(svgImageRenderer, aiCostMeter),
    captionWriter: createOpenAiCaptionWriter(aiCostMeter),

    parser: documentParser,
    publisherFor(platform) {
      const ciphertext = cipherCache.get(platform) ?? devCiphertext(userId, platform);
      cipherCache.set(platform, ciphertext);
      return createPublisher(platform, {
        transport,
        cipher: tokenCipher,
        accessTokenCiphertext: ciphertext,
      });
    },
  };
}

/** Resolves the stored (encrypted) credential, falling back to the dev token. */
export async function publisherWithStoredCredential(
  context: AppContext,
  platform: Platform,
  transportUrl?: string,
) {
  const stored = await context.credentials.find(platform);
  if (!stored) return context.publisherFor(platform);
  const transport = createFakePlatformTransport(resolveFakePlatformBaseUrl(transportUrl));
  return createPublisher(platform, {
    transport,
    cipher: tokenCipher,
    accessTokenCiphertext: stored.accessTokenCiphertext,
  });
}
