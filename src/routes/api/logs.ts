/** Worker + webhook logs for the dashboard. */
import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/store.server";

export const Route = createFileRoute("/api/logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const postId = new URL(request.url).searchParams.get("postId");
        const state = db();
        return Response.json({
          worker: state.workerLog.slice(0, 30),
          webhooks: (postId ? state.webhookLog.filter((w) => w.postId === postId) : state.webhookLog).slice(
            0,
            30,
          ),
          clockOffsetMs: state.clockOffsetMs,
          force429: state.force429,
          platformPostCount: state.platformPosts.length,
        });
      },
    },
  },
});
