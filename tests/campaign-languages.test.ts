import { describe, expect, it } from "vitest";
import { composeCaption } from "@/domain/captions";
import {
  campaignLanguageInputSchema,
  resolveCampaignLanguage,
} from "@/config/campaign-languages.config";

const post = {
  id: "post-lang",
  title: "Reliable social publishing",
  body: "Retries must not duplicate posts. Leases make a crashed worker safe.",
  url: "https://example.com/reliable",
};

describe("campaignLanguageInputSchema", () => {
  it("defaults to English when omitted", () => {
    expect(campaignLanguageInputSchema.parse(undefined)).toBe("en");
    expect(campaignLanguageInputSchema.parse(null)).toBe("en");
  });

  it("accepts supported language ids", () => {
    expect(campaignLanguageInputSchema.parse("tr")).toBe("tr");
  });
});

describe("composeCaption language", () => {
  it("uses Turkish fragments when Turkish is selected", () => {
    const caption = composeCaption(post, "instagram", { language: "tr" });
    expect(caption).toContain("ekibi");
    expect(caption.toLowerCase()).not.toContain("yayınladık");
    expect(caption).toMatch(/retry|lease|idempotency|duplicate/i);
  });

  it("falls back to English for unknown language codes", () => {
    expect(resolveCampaignLanguage("xx").id).toBe("en");
  });
});
