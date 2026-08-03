import { describe, expect, it } from "vitest";
import { createCampaign, generateImages } from "@/application/campaign-usecases";
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

    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.imagePath).toBeTruthy();
      expect(entry.imageWidth).toBeGreaterThan(0);
      expect(entry.imageHeight).toBeGreaterThan(0);
    }
  });
});
