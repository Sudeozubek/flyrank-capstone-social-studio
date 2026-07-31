/**
 * Signed delivery webhook — the sole writer of terminal entry status.
 * Unsigned, malformed or replayed-outside-tolerance payloads are rejected
 * with 401 and recorded for the audit log.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { applyDelivery } from "@/application/delivery-usecases";
import { isPlatform } from "@/domain/entities";
import {
  digest,
  SIGNATURE_HEADER,
  verifySignature,
} from "@/infrastructure/crypto/webhook-signature.server";
import { createAppContext } from "@/infrastructure/context.server";

const payloadSchema = z.object({
  entryId: z.string().uuid(),
  platform: z.string().refine(isPlatform, "unknown platform"),
  remoteId: z.string().min(1),
  status: z.enum(["delivered", "rejected"]),
  reason: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/webhooks/delivery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get(SIGNATURE_HEADER);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!verifySignature(raw, signature)) {
          await supabaseAdmin.from("webhook_events").insert({
            signature_valid: false,
            http_status: 401,
            payload_digest: digest(raw),
            message: "invalid or missing signature",
          });
          return Response.json({ error: "invalid signature" }, { status: 401 });
        }

        const parsed = payloadSchema.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) {
          await supabaseAdmin.from("webhook_events").insert({
            signature_valid: true,
            http_status: 400,
            payload_digest: digest(raw),
            message: parsed.error.issues[0]?.message ?? "invalid payload",
          });
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }

        const { data: entry } = await supabaseAdmin
          .from("social_post_entries")
          .select("user_id")
          .eq("id", parsed.data.entryId)
          .maybeSingle();

        if (!entry) {
          await supabaseAdmin.from("webhook_events").insert({
            signature_valid: true,
            http_status: 404,
            payload_digest: digest(raw),
            message: "unknown entry",
          });
          return Response.json({ error: "unknown entry" }, { status: 404 });
        }

        const context = createAppContext(supabaseAdmin as never, entry.user_id, {
          requestUrl: request.url,
        });
        const updated = await applyDelivery(context, parsed.data);

        await supabaseAdmin.from("webhook_events").insert({
          user_id: entry.user_id,
          entry_id: parsed.data.entryId,
          platform: parsed.data.platform as "instagram" | "x",
          signature_valid: true,
          http_status: 200,
          payload_digest: digest(raw),
          message: `status=${parsed.data.status}`,
        });

        return Response.json({ ok: true, status: updated?.status ?? "unknown" });
      },
    },
  },
});
