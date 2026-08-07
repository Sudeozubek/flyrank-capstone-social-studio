import { describe, expect, it } from "vitest";
import { createCampaign, generateImages } from "@/application/campaign-usecases";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORMS } from "@/domain/entities";
import { createMockAppContext } from "./helpers/mock-app-context";

describe("campaign image generation", () => {
  it("generateImages resolves platform dimensions without throwing", async () => {
    const { context } = createMockAppContext();
    const post = await context.posts.create({
      title: "Reliable social publishing",
      body: "Retries must not duplicate posts. Leases make a crashed worker safe.",
      url: "https://example.com/post",
      source: "paste",
    });
    const snapshot = await createCampaign(context, { postId: post.id });
    const entries = await generateImages(context, snapshot.campaign.id);

    expect(entries).toHaveLength(PLATFORMS.length);
    for (const entry of entries) {
      const spec = PLATFORM_SPECS[entry.platform];
      expect(entry.imagePath).toBeTruthy();
      expect(entry.imageWidth).toBe(spec.width);
      expect(entry.imageHeight).toBe(spec.height);
    }
  });
});
