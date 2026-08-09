import { z } from "zod";
import { getCampaignSnapshot } from "@/application/campaign-usecases";
import { withApp } from "../context";
import { defineTool } from "../types";
import { snapshotView } from "../views";

export default defineTool({
  name: "get_campaign",
  title: "Get campaign",
  description:
    "Fetch one campaign owned by the caller with its source blog post and every per-platform entry (caption, image size, status).",
  schema: z.object({ campaignId: z.string().uuid().describe("Campaign ID.") }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ campaignId }, ctx) =>
    withApp(ctx, async (app) => snapshotView(await getCampaignSnapshot(app, campaignId))),
});
