/**
 * Wk8 — signed delivery webhook. The ONLY writer of `published` / `failed`.
 * Forged or stale signatures are rejected with 400 and change no state.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { logWebhook, mutate, now } from "@/lib/store.server";
import { SIGNATURE_HEADER, verifySignature } from "@/lib/webhook-signature.server";

const bodySchema = z.object({
  event: z.literal("post.delivered"),
  platform: z.string(),
  post_id: z.string(),
  entry_id: z.string(),
  remote_id: z.string().optional(),
  idempotency_key: z.string(),
  status: z.enum(["published", "failed"]),
  error: z.string().optional(),
});

export const Route = createFileRoute("/api/public/webhooks/delivery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        if (!verifySignature(raw, request.headers.get(SIGNATURE_HEADER))) {
          logWebhook({
            postId: "unknown",
            verified: false,
            status: 400,
            message: "invalid signature — rejected, no state change",
          });
          return new Response("invalid signature", { status: 400 });
        }

        const parsed = bodySchema.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) {
          logWebhook({ postId: "unknown", verified: true, status: 400, message: "invalid payload" });
          return new Response("invalid payload", { status: 400 });
        }
        const event = parsed.data;

        const applied = mutate((s) => {
          const row =
            s.entries.find((e) => e.idempotencyKey === event.idempotency_key) ??
            s.entries.find((e) => e.id === event.entry_id);
          if (!row) return false;
          if (row.status === "published") return true; // webhook replay — idempotent
          row.status = event.status;
          row.updatedAt = now().toISOString();
          delete row.leaseUntil;
          if (event.status === "published") {
            row.publishedAt = now().toISOString();
            if (event.remote_id) row.remoteId = event.remote_id;
            delete row.error;
          } else {
            row.error = event.error ?? "platform reported failure";
          }
          return true;
        });

        logWebhook({
          postId: event.post_id,
          entryId: event.entry_id,
          verified: true,
          status: applied ? 200 : 404,
          message: applied
            ? `signature ok → status ${event.status} (${event.platform})`
            : "signature ok but no matching entry",
        });

        return applied ? Response.json({ ok: true }) : new Response("unknown entry", { status: 404 });
      },
    },
  },
});
