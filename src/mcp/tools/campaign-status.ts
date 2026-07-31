import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { withApp } from "../context";
import { defineTool } from "../types";

export default defineTool({
  name: "campaign_status",
  title: "Campaign status",
  description:
    "Compact delivery status for one campaign: overall status plus per-platform entry status, attempts, remote id and last error.",
  schema: z.object({ campaignId: z.string().uuid().describe("Campaign ID.") }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, async (app) => {
      const { campaign, entries } = await getCampaignSnapshot(app, campaignId);
      return {
        campaignId: campaign.id,
        name: campaign.name,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        entries: entries.map((entry) => ({
          platform: entry.platform,
          status: entry.status,
          attempts: entry.attempts,
          scheduledFor: entry.scheduledFor,
          nextAttemptAt: entry.nextAttemptAt,
          remoteId: entry.remoteId,
          publishedAt: entry.publishedAt,
          error: entry.error,
        })),
      };
    }),
});
