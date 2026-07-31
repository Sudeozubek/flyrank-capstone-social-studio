/** Publish now: clear any schedule and kick a worker tick. */
import { createFileRoute } from "@tanstack/react-router";
import { getCampaign } from "@/lib/campaign.server";
import { mutate, now } from "@/lib/store.server";
import { ensureWorker, runWorkerTick } from "@/lib/worker.server";

export const Route = createFileRoute("/api/campaigns/$postId/publish")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const campaign = getCampaign(params.postId);
        if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });

        mutate((s) => {
          for (const row of s.entries) {
            if (row.postId !== params.postId) continue;
            if (row.status === "published" || row.status === "publishing") continue;
            delete row.scheduledFor;
            row.status = "queued";
            row.updatedAt = now().toISOString();
          }
        });

        ensureWorker();
        const result = await runWorkerTick();
        return Response.json({ ok: true, ...result, campaign: getCampaign(params.postId) });
      },
    },
  },
});
