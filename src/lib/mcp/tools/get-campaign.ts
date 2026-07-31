import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { withApp } from "../context";

export default defineTool({
  name: "get_campaign",
  title: "Get campaign",
  description:
    "Fetch one campaign owned by the caller with its source blog post and every per-platform entry (caption, image size, status).",
  inputSchema: { campaignId: z.string().uuid().describe("Campaign ID.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, (app) => getCampaignSnapshot(app, campaignId)),
});
