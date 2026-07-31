/**
 * Fake social platform (interfaces layer). Stands in for Instagram/X so no
 * real network is ever called. Implements exactly the behaviours the publish
 * flow must survive:
 *  - Bearer auth
 *  - Idempotency-Key replay collapsing
 *  - 429 + Retry-After (deterministically injectable for demos/tests)
 *  - asynchronous, HMAC-signed delivery webhook
 */

import { createFileRoute } from "@tanstack/react-router";
import { isPlatform } from "@/domain/entities";
import { signPayload, SIGNATURE_HEADER } from "@/infrastructure/crypto/webhook-signature.server";

interface StoredPost {
  id: string;
  platform: string;
  caption: string;
  createdAt: string;
}

// Process-local platform memory. The fake platform is a test double: its
// durability is deliberately not part of the system under test.
const posts = new Map<string, StoredPost>();
const rateLimitBudget = new Map<string, number>();

export function setRateLimit(platform: string, failures: number) {
  rateLimitBudget.set(platform, failures);
}

export function fakePlatformState() {
  return {
    posts: [...posts.values()],
    rateLimits: Object.fromEntries(rateLimitBudget),
  };
}

export function resetFakePlatform() {
  posts.clear();
  rateLimitBudget.clear();
}

async function fireDeliveryWebhook(origin: string, payload: Record<string, unknown>, delayMs: number) {
  const body = JSON.stringify(payload);
  const send = async () => {
    try {
      await fetch(`${origin}/api/public/webhooks/delivery`, {
        method: "POST",
        headers: { "content-type": "application/json", [SIGNATURE_HEADER]: signPayload(body) },
        body,
      });
    } catch {
      // A dropped webhook is a legitimate platform behaviour; the entry simply
      // stays `publishing` until the platform (or an operator) re-sends it.
    }
  };
  if (delayMs <= 0) await send();
  else setTimeout(() => void send(), delayMs);
}

export const Route = createFileRoute("/api/public/fake-platform/$platform/posts")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const platform = params.platform;
        if (!isPlatform(platform)) {
          return Response.json({ error: "unknown platform" }, { status: 404 });
        }

        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ") || auth.length < 16) {
          return Response.json({ error: "invalid_token" }, { status: 401 });
        }

        const idempotencyKey = request.headers.get("idempotency-key");
        if (!idempotencyKey) {
          return Response.json({ error: "idempotency-key required" }, { status: 400 });
        }

        const remaining = rateLimitBudget.get(platform) ?? 0;
        if (remaining > 0) {
          rateLimitBudget.set(platform, remaining - 1);
          return Response.json(
            { error: "rate_limited" },
            { status: 429, headers: { "retry-after": "2" } },
          );
        }

        const payload = (await request.json().catch(() => ({}))) as Record<string, any>;
        const caption = String(payload["caption"] ?? payload["text"] ?? "");
        const clientRef = String(payload["client_ref"] ?? "");
        const origin = new URL(request.url).origin;

        const existing = posts.get(idempotencyKey);
        if (existing) {
          // Replay: same remote id, no second post, webhook re-sent.
          await fireDeliveryWebhook(origin, {
            entryId: clientRef,
            platform,
            remoteId: existing.id,
            status: "delivered",
          }, 0);
          return Response.json({ id: existing.id, duplicate: true }, { status: 200 });
        }

        const id = `${platform}_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
        posts.set(idempotencyKey, {
          id,
          platform,
          caption,
          createdAt: new Date().toISOString(),
        });

        await fireDeliveryWebhook(
          origin,
          { entryId: clientRef, platform, remoteId: id, status: "delivered" },
          150,
        );

        return Response.json({ id, duplicate: false }, { status: 201 });
      },

      GET: async ({ params }) => {
        const platform = params.platform;
        return Response.json({
          platform,
          posts: [...posts.values()].filter((p) => p.platform === platform),
        });
      },
    },
  },
});
