/**
 * FAKE PLATFORM — publish endpoint. Sandbox only.
 * Simulates: bearer auth, rate limiting (429 + Retry-After), idempotency keys,
 * and an asynchronous signed delivery webhook.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isPlatform } from "@/config/platform-specs";
import { db, mutate, newId } from "@/lib/store.server";
import { signPayload, SIGNATURE_HEADER } from "@/lib/webhook-signature.server";
import { baseUrl } from "@/lib/publisher/adapters/fake-transport";

const bodySchema = z.object({
  platform: z.string().refine(isPlatform, "unknown platform"),
  post_id: z.string().min(1),
  entry_id: z.string().min(1),
  caption: z.string().min(1),
  image_url: z.string().min(1),
});

const DELIVERY_DELAY_MS = 1200;

function fireDeliveryWebhook(payload: Record<string, unknown>) {
  setTimeout(() => {
    const body = JSON.stringify(payload);
    void fetch(`${baseUrl()}/api/public/webhooks/delivery`, {
      method: "POST",
      headers: { "content-type": "application/json", [SIGNATURE_HEADER]: signPayload(body) },
      body,
    }).catch(() => undefined);
  }, DELIVERY_DELAY_MS);
}

export const Route = createFileRoute("/api/public/fake-platform/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer fpt_")) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const idempotencyKey = request.headers.get("idempotency-key");
        if (!idempotencyKey) {
          return Response.json({ error: "idempotency-key header required" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
        }
        const data = parsed.data;

        // Dev-triggered rate limiting.
        if (db().force429 > 0) {
          const retryAfter = 2;
          mutate((s) => {
            s.force429 -= 1;
          });
          return new Response(JSON.stringify({ error: "rate_limited" }), {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
          });
        }

        const existing = db().platformPosts.find((p) => p.idempotencyKey === idempotencyKey);
        if (existing) {
          fireDeliveryWebhook({
            event: "post.delivered",
            platform: existing.platform,
            post_id: data.post_id,
            entry_id: data.entry_id,
            remote_id: existing.id,
            idempotency_key: idempotencyKey,
            status: "published",
          });
          return Response.json({ id: existing.id, duplicate: true }, { status: 200 });
        }

        const id = newId("fp");
        mutate((s) => {
          s.platformPosts.push({
            id,
            platform: data.platform,
            idempotencyKey,
            caption: data.caption,
            imageUrl: data.image_url,
            createdAt: new Date().toISOString(),
          });
        });

        fireDeliveryWebhook({
          event: "post.delivered",
          platform: data.platform,
          post_id: data.post_id,
          entry_id: data.entry_id,
          remote_id: id,
          idempotency_key: idempotencyKey,
          status: "published",
        });

        return Response.json({ id, duplicate: false }, { status: 201 });
      },

      GET: async () => Response.json({ posts: db().platformPosts }),
    },
  },
});
