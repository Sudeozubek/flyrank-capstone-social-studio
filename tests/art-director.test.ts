import { describe, expect, it } from "vitest";
import { buildFallbackImagePrompt } from "@/infrastructure/ai/openai-art-director.server";
import { createInMemoryAiCostMeter } from "@/infrastructure/ai/ai-cost-meter.server";
import { createAiImageRenderer } from "@/infrastructure/imaging/ai-image-renderer.server";
import { svgImageRenderer } from "@/infrastructure/imaging/renderers.server";

const post = {
  title: "Reliable social publishing",
  body: "Retries must not duplicate posts. Leases make a crashed worker safe. Idempotency keys collapse replays into one remote post.",
};

describe("buildFallbackImagePrompt", () => {
  it("mentions the article topic and platform", () => {
    const prompt = buildFallbackImagePrompt({
      ...post,
      platform: "instagram",
      brand: "Acme",
      brandTone: "professional",
    });

    expect(prompt.toLowerCase()).toContain("reliable social publishing");
    expect(prompt.toLowerCase()).toContain("instagram");
    expect(prompt.toLowerCase()).toContain("professional");
    expect(prompt.toLowerCase()).toContain("acme");
  });

  it("varies by platform aspect ratio", () => {
    const ig = buildFallbackImagePrompt({ ...post, platform: "instagram", brand: "Acme" });
    const x = buildFallbackImagePrompt({ ...post, platform: "x", brand: "Acme" });
    expect(ig).toContain("1:1");
    expect(x).toContain("16:9");
  });
});

describe("createAiImageRenderer", () => {
  it("falls back to SVG when OPENAI_API_KEY is missing", async () => {
    const previous = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];

    try {
      const renderer = createAiImageRenderer(svgImageRenderer, createInMemoryAiCostMeter());
      const out = await renderer.render({
        platform: "instagram",
        width: 1080,
        height: 1080,
        title: post.title,
        body: post.body,
        seed: "seed",
        brand: "CampaignHub",
        subject: { x: 120, y: 120, width: 840, height: 840 },
      });
      expect(["sharp", "jimp"]).toContain(out.renderer);
      expect(out.width).toBe(1080);
      expect(out.height).toBe(1080);
    } finally {
      if (previous) process.env["OPENAI_API_KEY"] = previous;
    }
  });
});
