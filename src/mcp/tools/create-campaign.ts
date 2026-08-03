import { CAMPAIGN_LANGUAGE_IDS } from "@/config/campaign-languages.config";
import { BRAND_TONE_IDS } from "@/config/brand-tones.config";
import { z } from "zod";
import { createCampaign, generateImages, getCampaignSnapshot } from "@/application/campaign-usecases";
import { withApp } from "../context";
import { defineTool } from "../types";

export default defineTool({
  name: "create_campaign",
  title: "Create campaign",
  description:
    "Create a campaign from one of the signed-in user's blog posts. Generates platform captions and image variants through the same use cases the web app calls.",
  schema: z.object({
    postId: z.string().uuid().describe("ID of an existing blog post owned by the caller."),
    name: z.string().max(200).optional().describe("Optional campaign name."),
    brandName: z.string().max(120).optional().describe("Optional brand / company name."),
    brandTone: z.enum(BRAND_TONE_IDS).optional().describe("Optional brand tone id (friendly, professional, casual, …)."),
    brandLanguage: z.enum(CAMPAIGN_LANGUAGE_IDS).optional().describe("Caption/image language (en, tr, de, bs, fr, ar). Defaults to en."),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) =>
    withApp(ctx, async (app) => {
      const snapshot = await createCampaign(app, {
        postId: input.postId,
        ...(input.name ? { name: input.name } : {}),
        brandName: input.brandName ?? null,
        brandTone: input.brandTone ?? null,
        brandLanguage: input.brandLanguage ?? "en",
      });
      await generateImages(app, snapshot.campaign.id);
      return getCampaignSnapshot(app, snapshot.campaign.id);
    }),
});
