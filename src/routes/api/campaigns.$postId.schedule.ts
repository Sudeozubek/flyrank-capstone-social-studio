/** Schedule (or reschedule) every unfinished entry of a campaign. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign.server";
import { mutate, now } from "@/lib/store.server";
import { ensureWorker } from "@/lib/worker.server";

const schema = z.object({ scheduledFor: z.string().datetime() });

export const Route = createFileRoute("/api/campaigns/$postId/schedule")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        if (!getCampaign(params.postId)) return Response.json({ error: "not_found" }, { status: 404 });
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
        }

        mutate((s) => {
          for (const row of s.entries) {
            if (row.postId !== params.postId) continue;
            if (row.status === "published" || row.status === "publishing") continue;
            row.status = "queued";
            row.scheduledFor = parsed.data.scheduledFor;
            row.updatedAt = now().toISOString();
          }
        });

        ensureWorker();
        return Response.json({ ok: true, campaign: getCampaign(params.postId) });
      },
    },
  },
});
