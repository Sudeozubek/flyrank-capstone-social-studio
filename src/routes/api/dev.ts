/**
 * Dev-only control panel API: force a 429, advance the dev clock, run a tick,
 * fire a forged/valid webhook, reset state. Guarded off in production.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, logWorker, mutate, now, resetStore } from "@/lib/store.server";
import { getCampaign } from "@/lib/campaign.server";
import { signPayload, SIGNATURE_HEADER } from "@/lib/webhook-signature.server";
import { baseUrl } from "@/lib/publisher/adapters/fake-transport";
import { ensureWorker, runWorkerTick } from "@/lib/worker.server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("force429"), count: z.number().int().min(1).max(10).default(2) }),
  z.object({ action: z.literal("advanceClock"), minutes: z.number().min(0).max(1440) }),
  z.object({ action: z.literal("resetClock") }),
  z.object({ action: z.literal("tick") }),
  z.object({ action: z.literal("reset") }),
  z.object({
    action: z.literal("sendWebhook"),
    postId: z.string(),
    forged: z.boolean().default(false),
    status: z.enum(["published", "failed"]).default("published"),
  }),
]);

export const Route = createFileRoute("/api/dev")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["NODE_ENV"] === "production" && process.env["ENABLE_DEV_PANEL"] !== "true") {
          return Response.json({ error: "dev panel disabled" }, { status: 403 });
        }

        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
        }
        const input = parsed.data;
        ensureWorker();

        switch (input.action) {
          case "force429": {
            mutate((s) => {
              s.force429 += input.count;
            });
            logWorker("warn", `dev: next ${input.count} publish call(s) will return 429`);
            return Response.json({ ok: true, force429: db().force429 });
          }
          case "advanceClock": {
            mutate((s) => {
              s.clockOffsetMs += input.minutes * 60_000;
            });
            logWorker("info", `dev: clock advanced ${input.minutes}m → ${now().toISOString()}`);
            const result = await runWorkerTick();
            return Response.json({ ok: true, clockOffsetMs: db().clockOffsetMs, ...result });
          }
          case "resetClock": {
            mutate((s) => {
              s.clockOffsetMs = 0;
            });
            return Response.json({ ok: true, clockOffsetMs: 0 });
          }
          case "tick": {
            return Response.json({ ok: true, ...(await runWorkerTick()) });
          }
          case "reset": {
            resetStore();
            return Response.json({ ok: true });
          }
          case "sendWebhook": {
            const campaign = getCampaign(input.postId);
            const entry = campaign?.entries[0];
            if (!entry) return Response.json({ error: "no entry to target" }, { status: 404 });

            const body = JSON.stringify({
              event: "post.delivered",
              platform: entry.platform,
              post_id: entry.postId,
              entry_id: entry.id,
              remote_id: entry.remoteId ?? "fp_manual",
              idempotency_key: entry.idempotencyKey,
              status: input.status,
            });
            const signature = input.forged ? "t=1,v1=deadbeef" : signPayload(body);
            const res = await fetch(`${baseUrl()}/api/public/webhooks/delivery`, {
              method: "POST",
              headers: { "content-type": "application/json", [SIGNATURE_HEADER]: signature },
              body,
            });
            return Response.json({ ok: res.ok, status: res.status, forged: input.forged });
          }
        }
      },
    },
  },
});
