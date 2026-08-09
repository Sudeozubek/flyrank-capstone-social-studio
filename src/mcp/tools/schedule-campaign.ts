import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { scheduleCampaign } from "@/application/publish-usecases";
import { withApp } from "../context";
import { defineTool } from "../types";
import { snapshotView } from "../views";

export default defineTool({
  name: "schedule_campaign",
  title: "Schedule campaign",
  description:
    "Queue every entry of a campaign for delivery at an ISO timestamp. The durable worker publishes it; nothing is sent immediately.",
  schema: z.object({
    campaignId: z.string().uuid().describe("Campaign ID."),
    scheduledFor: z
      .string()
      .datetime({ offset: true })
      .describe("ISO 8601 timestamp for delivery, e.g. 2026-08-01T09:00:00Z."),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ campaignId, scheduledFor }, ctx) =>
    withApp(ctx, async (app) => {
      await scheduleCampaign(app, { campaignId, scheduledFor });
      return snapshotView(await getCampaignSnapshot(app, campaignId));
    }),
});
