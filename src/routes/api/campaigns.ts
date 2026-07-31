/** Campaign collection: list all, create/schedule one. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PLATFORMS } from "@/config/platform-specs";
import { createCampaign, listCampaigns } from "@/lib/campaign.server";
import { ensureWorker } from "@/lib/worker.server";

const createSchema = z.object({
  postId: z.string().min(1),
  platforms: z.array(z.enum(PLATFORMS)).min(1).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/campaigns")({
  server: {
    handlers: {
      GET: async () => {
        ensureWorker();
        return Response.json({ campaigns: listCampaigns() });
      },
      POST: async ({ request }) => {
        const parsed = createSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_request", details: parsed.error.issues }, { status: 400 });
        }
        try {
          ensureWorker();
          const campaign = createCampaign(parsed.data);
          return Response.json({ campaign }, { status: 201 });
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "failed" }, { status: 404 });
        }
      },
    },
  },
});
