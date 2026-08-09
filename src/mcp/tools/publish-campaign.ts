import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { publishCampaign } from "@/application/publish-usecases";
import { withApp } from "../context";
import { defineTool } from "../types";
import { snapshotView } from "../views";

export default defineTool({
  name: "publish_campaign",
  title: "Publish campaign",
  description:
    "Publish a campaign now through the idempotent publishing pipeline (Retry-After aware). Terminal status arrives via the signed delivery webhook.",
  schema: z.object({ campaignId: z.string().uuid().describe("Campaign ID.") }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, async (app) => {
      await publishCampaign(app, campaignId);
      return snapshotView(await getCampaignSnapshot(app, campaignId));
    }),
});
