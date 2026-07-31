/**
 * SocialPublisher adapters. One class per platform, both speaking the same
 * interface so the application layer never branches on platform identity.
 *
 * Shared behaviour (auth header, idempotency key, response mapping) lives in
 * the base class; platform differences live in the payload shaping.
 */

import type { Platform } from "@/domain/entities";
import type { PublishInput, PublishResult, SocialPublisher, TokenCipher } from "@/domain/ports";
import type { FakePlatformTransport } from "./fake-platform-transport.server";

export interface AdapterDeps {
  transport: FakePlatformTransport;
  cipher: TokenCipher;
  /** Encrypted OAuth token; decrypted only in memory, only at call time. */
  accessTokenCiphertext: string;
}

abstract class BaseFakeAdapter implements SocialPublisher {
  abstract readonly platform: Platform;

  constructor(protected readonly deps: AdapterDeps) {}

  protected abstract payload(input: PublishInput): Record<string, unknown>;

  async publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult> {
    const token = this.deps.cipher.decrypt(this.deps.accessTokenCiphertext);
    const response = await this.deps.transport.post(this.platform, this.payload(input), {
      authorization: `Bearer ${token}`,
      "idempotency-key": idempotencyKey,
    });

    if (response.status === 429) {
      return {
        outcome: "rate_limited",
        httpStatus: 429,
        retryAfterSec: response.retryAfterSec ?? 30,
        error: "rate limited by platform",
      };
    }
    if (response.status === 200 && response.body?.duplicate) {
      return { outcome: "duplicate", httpStatus: 200, remoteId: response.body?.id };
    }
    if (response.status >= 200 && response.status < 300 && response.body?.id) {
      return { outcome: "accepted", httpStatus: response.status, remoteId: response.body.id };
    }
    return {
      outcome: "failed",
      httpStatus: response.status,
      error: String(response.body?.error ?? `platform returned ${response.status}`),
    };
  }
}

export class InstagramFakeAdapter extends BaseFakeAdapter {
  readonly platform: Platform = "instagram";
  protected payload(input: PublishInput) {
    return {
      media_type: "IMAGE",
      image_ref: input.imageRef,
      caption: input.caption,
      client_ref: input.entryId,
    };
  }
}

export class XFakeAdapter extends BaseFakeAdapter {
  readonly platform: Platform = "x";
  protected payload(input: PublishInput) {
    return {
      text: input.caption,
      media: { ref: input.imageRef },
      client_ref: input.entryId,
    };
  }
}

export function createPublisher(platform: Platform, deps: AdapterDeps): SocialPublisher {
  return platform === "instagram" ? new InstagramFakeAdapter(deps) : new XFakeAdapter(deps);
}
