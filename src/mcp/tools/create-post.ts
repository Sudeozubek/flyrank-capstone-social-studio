import { z } from "zod";
import { ingestPastedPost } from "@/application/ingest-content";
import { withApp } from "../context";
import { defineTool } from "../types";

export default defineTool({
  name: "create_post",
  title: "Create blog post",
  description:
    "Store a blog post from pasted text so it can drive a campaign. Returns the postId to pass to `create_campaign`.",
  schema: z.object({
    body: z.string().min(40).describe("Full post body — at least 40 characters."),
    title: z
      .string()
      .max(200)
      .optional()
      .describe("Optional title; derived from the first line when omitted."),
    url: z.string().url().optional().describe("Optional canonical URL of the published post."),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) =>
    withApp(ctx, async (app) => {
      const post = await ingestPastedPost(app, {
        body: input.body,
        ...(input.title ? { title: input.title } : {}),
        ...(input.url ? { url: input.url } : {}),
      });
      return { id: post.id, title: post.title, url: post.url, source: post.source };
    }),
});
