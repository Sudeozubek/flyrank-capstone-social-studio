import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createCampaign, generateImages, getCampaignSnapshot } from "@/application/campaign-usecases";
import { withApp } from "../context";

export default defineTool({
  name: "create_campaign",
  title: "Create campaign",
  description:
    "Create a campaign from one of the signed-in user's blog posts. Generates platform captions and image variants through the same use cases the web app calls.",
  inputSchema: {
    postId: z.string().uuid().describe("ID of an existing blog post owned by the caller."),
    name: z.string().max(200).optional().describe("Optional campaign name."),
    brandName: z.string().max(120).optional().describe("Optional brand / company name."),
    brandTone: z.string().max(200).optional().describe("Optional brand tone of voice."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) =>
    withApp(ctx, async (app) => {
      const snapshot = await createCampaign(app, {
        postId: input.postId,
        ...(input.name ? { name: input.name } : {}),
        brandName: input.brandName ?? null,
        brandTone: input.brandTone ?? null,
      });
      await generateImages(app, snapshot.campaign.id);
      return getCampaignSnapshot(app, snapshot.campaign.id);
    }),
});
