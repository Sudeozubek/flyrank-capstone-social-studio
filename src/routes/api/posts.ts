/** Blog posts available to campaign, plus their generated preview. */
import { createFileRoute } from "@tanstack/react-router";
import { listPosts, previewCampaign } from "@/lib/campaign.server";

export const Route = createFileRoute("/api/posts")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          posts: listPosts().map((post) => ({ ...post, preview: previewCampaign(post) })),
        }),
    },
  },
});
