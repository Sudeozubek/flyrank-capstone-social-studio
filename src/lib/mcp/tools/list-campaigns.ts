import { defineTool } from "@lovable.dev/mcp-js";
import { withApp } from "../context";

export default defineTool({
  name: "list_campaigns",
  title: "List campaigns",
  description: "List every campaign belonging to the signed-in user, newest first.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => withApp(ctx, async (app) => ({ campaigns: await app.campaigns.list() })),
});
