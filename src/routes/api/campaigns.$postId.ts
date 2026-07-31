/** Per-campaign status. */
import { createFileRoute } from "@tanstack/react-router";
import { getCampaign } from "@/lib/campaign.server";

export const Route = createFileRoute("/api/campaigns/$postId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const campaign = getCampaign(params.postId);
        if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });
        return Response.json({ campaign });
      },
    },
  },
});
