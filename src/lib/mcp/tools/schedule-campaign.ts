import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { scheduleCampaign } from "@/application/publish-usecases";
import { withApp } from "../context";

export default defineTool({
  name: "schedule_campaign",
  title: "Schedule campaign",
  description:
    "Queue every entry of a campaign for delivery at an ISO timestamp. The durable worker publishes it; nothing is sent immediately.",
  inputSchema: {
    campaignId: z.string().uuid().describe("Campaign ID."),
    scheduledFor: z.string().describe("ISO 8601 timestamp for delivery, e.g. 2026-08-01T09:00:00Z."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ campaignId, scheduledFor }, ctx) =>
    withApp(ctx, async (app) => {
      await scheduleCampaign(app, { campaignId, scheduledFor });
      return getCampaignSnapshot(app, campaignId);
    }),
});
