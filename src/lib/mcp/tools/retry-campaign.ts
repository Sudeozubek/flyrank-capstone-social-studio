import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { retryCampaign } from "@/application/publish-usecases";
import { withApp } from "../context";

export default defineTool({
  name: "retry_campaign",
  title: "Retry campaign",
  description:
    "Retry the failed or rate-limited entries of a campaign. The deterministic idempotency key prevents duplicate remote posts.",
  inputSchema: { campaignId: z.string().uuid().describe("Campaign ID.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, async (app) => {
      await retryCampaign(app, campaignId);
      return getCampaignSnapshot(app, campaignId);
    }),
});
