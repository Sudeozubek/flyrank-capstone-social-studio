import { z } from "zod";
import { withApp } from "../context";
import { defineTool } from "../types";

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description: "List every campaign belonging to the signed-in user, newest first.",
  schema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum campaigns to return (default 25)."),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) =>
    withApp(ctx, async (app) => {
      const campaigns = await app.campaigns.list();
      return { total: campaigns.length, campaigns: campaigns.slice(0, limit ?? 25) };
    }),
});
