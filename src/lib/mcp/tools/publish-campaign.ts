import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { publishCampaign } from "@/application/publish-usecases";
import { withApp } from "../context";

export default defineTool({
  name: "publish_campaign",
  title: "Publish campaign",
  description:
    "Publish a campaign now through the idempotent publishing pipeline (Retry-After aware). Terminal status arrives via the signed delivery webhook.",
  inputSchema: { campaignId: z.string().uuid().describe("Campaign ID.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, async (app) => {
      await publishCampaign(app, campaignId);
      return getCampaignSnapshot(app, campaignId);
    }),
});
