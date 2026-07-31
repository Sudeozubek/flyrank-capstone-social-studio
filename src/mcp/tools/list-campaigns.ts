import { z } from "zod";
import { withApp } from "../context";
import { defineTool } from "../types";

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description: "List every campaign belonging to the signed-in user, newest first.",
  schema: z.object({}),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) =>
    withApp(ctx, async (app) => ({ campaigns: await app.campaigns.list() })),
});
