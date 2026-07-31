/** Blog posts available to campaign, plus their generated preview. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createPost, deletePost, listPosts, previewCampaign } from "@/lib/campaign.server";

const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(20).max(5000),
  url: z.string().trim().url().max(300).optional(),
});

const badRequest = (issues: unknown) => Response.json({ error: "invalid_input", issues }, { status: 400 });

export const Route = createFileRoute("/api/posts")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          posts: listPosts().map((post) => ({ ...post, preview: previewCampaign(post) })),
        }),

      /** Adds a user-authored blog post; captions + variants are generated from it. */
      POST: async ({ request }) => {
        const parsed = createSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return badRequest(parsed.error.issues);
        const post = createPost(parsed.data);
        return Response.json({ post: { ...post, preview: previewCampaign(post) } }, { status: 201 });
      },

      DELETE: async ({ request }) => {
        const parsed = z
          .object({ postId: z.string().min(1) })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return badRequest(parsed.error.issues);
        if (!deletePost(parsed.data.postId)) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
