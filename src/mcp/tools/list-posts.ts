import { z } from "zod";
import { withApp } from "../context";
import { defineTool } from "../types";

/** Bodies are long; a listing only needs enough to recognise the post. */
const PREVIEW_CHARS = 240;

export default defineTool({
  name: "list_posts",
  title: "List blog posts",
  description:
    "List the signed-in user's blog posts with a short body preview. Use this to find the postId that `create_campaign` requires.",
  schema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum posts to return (default 25)."),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) =>
    withApp(ctx, async (app) => {
      const posts = await app.posts.list();
      return {
        total: posts.length,
        posts: posts.slice(0, limit ?? 25).map((post) => ({
          id: post.id,
          title: post.title,
          url: post.url,
          source: post.source,
          createdAt: post.createdAt,
          preview:
            post.body.length > PREVIEW_CHARS ? `${post.body.slice(0, PREVIEW_CHARS)}…` : post.body,
        })),
      };
    }),
});
