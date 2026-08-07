import { describe, expect, it } from "vitest";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORMS } from "@/domain/entities";
import {
  clamp,
  composeCaption,
  splitSentences,
  stableHash,
  summarize,
} from "@/domain/captions";

const post = {
  id: "post-42",
  title: "Reliable social publishing",
  body: "Retries must not duplicate posts. Leases make a crashed worker safe. Idempotency keys collapse replays into one remote post. Every attempt is recorded for audit.",
  url: "https://example.com/reliable-publishing",
};

describe("caption helpers", () => {
  it("stableHash is deterministic", () => {
    expect(stableHash("hello")).toBe(stableHash("hello"));
    expect(stableHash("hello")).not.toBe(stableHash("world"));
  });

  it("splitSentences splits on sentence boundaries", () => {
    const sentences = splitSentences("First. Second! Third?");
    expect(sentences).toEqual(["First.", "Second!", "Third?"]);
  });

  it("summarize takes the first N sentences", () => {
    expect(summarize(post.body, 2)).toBe(
      "Retries must not duplicate posts. Leases make a crashed worker safe.",
    );
  });

  it("clamp trims on a word boundary with an ellipsis", () => {
    const long = "one two three four five six seven eight nine ten";
    const result = clamp(long, 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("nine");
  });
});

describe("composeCaption X length", () => {
  const longPost = {
    id: "post-tr",
    title:
      "Yeni yazı: Dış araştırmaları desteklemek için Anthropic Ekonomik Gelecekler Araştırma Fonu",
    body: "Anthropic, toplumun AI'nın ekonomik etkilerine hazırlanmasına yönelik hırslı dış araştırmaları desteklemek için 200 milyon dolar taahhüt ediyor.",
    url: "https://example.com/anthropic-fund",
  };

  it("avoids trailing ellipsis on long Turkish posts", () => {
    const caption = composeCaption(longPost, "x", { language: "tr" });
    expect(caption.endsWith("…")).toBe(false);
    expect(caption).not.toContain("…");
    expect(caption.length).toBeLessThanOrEqual(PLATFORM_SPECS.x.maxCaptionLength);
  });

  it("uses multi-paragraph structure and fills more of the X character budget", () => {
    const caption = composeCaption(post, "x");
    expect(caption.split("\n\n").length).toBeGreaterThanOrEqual(3);
    expect(caption.length).toBeGreaterThan(160);
    expect(caption.length).toBeLessThanOrEqual(PLATFORM_SPECS.x.maxCaptionLength);
  });
});

describe("composeCaption Instagram layout", () => {
  it("keeps multi-paragraph line breaks in the template", () => {
    const caption = composeCaption(post, "instagram");
    expect(caption.split("\n\n").length).toBeGreaterThanOrEqual(3);
    expect(caption).toContain("\n\n");
  });
});

describe("composeCaption brand substitution", () => {
  it("replaces {brand} with the provided brand name", () => {
    const caption = composeCaption(post, "instagram", { name: "Acme Corp" });
    expect(caption.toLowerCase()).toContain("acme");
  });

  it("respects platform length limits after brand substitution", () => {
    for (const platform of PLATFORMS) {
      const caption = composeCaption(post, platform, { name: "Very Long Brand Name International" });
      expect(caption.length).toBeLessThanOrEqual(PLATFORM_SPECS[platform].maxCaptionLength);
    }
  });
});

describe("composeCaption brand tone", () => {
  it("changes the caption when a brand tone is selected", () => {
    const defaultCaption = composeCaption(post, "instagram");
    const playful = composeCaption(post, "instagram", { tone: "playful" });
    const professional = composeCaption(post, "instagram", { tone: "professional" });

    expect(playful).not.toEqual(defaultCaption);
    expect(professional).not.toEqual(defaultCaption);
    expect(playful).not.toEqual(professional);
  });

  it("uses tone-specific sign-offs", () => {
    const playful = composeCaption(post, "instagram", { name: "Acme", tone: "playful" });
    const professional = composeCaption(post, "instagram", { name: "Acme", tone: "professional" });

    expect(playful).toContain("— Acme (yes, we write too)");
    expect(professional).toContain("— the Acme team");
  });

  it("applies brand tone with non-English languages", () => {
    const neutral = composeCaption(post, "linkedin", { language: "tr" });
    const professional = composeCaption(post, "linkedin", {
      language: "tr",
      tone: "professional",
      name: "Acme",
    });

    expect(professional).not.toEqual(neutral);
    expect(professional).toContain("Acme");
  });

  it("anchors captions to article content instead of generic promos", () => {
    const caption = composeCaption(post, "instagram");
    expect(caption.toLowerCase()).toMatch(/retry|lease|idempotency|duplicate/);
    expect(caption.toLowerCase()).not.toContain("we shipped something worth reading");
  });

  it("varies openers across different posts", () => {
    const otherPost = {
      ...post,
      id: "post-99",
      title: "Observability for async workers",
      body: "Metrics should explain queue depth, not just CPU. Dashboards need actionable signals when leases expire.",
    };
    const a = composeCaption(post, "instagram");
    const b = composeCaption(otherPost, "instagram");
    expect(a.split("\n\n")[0]).not.toEqual(b.split("\n\n")[0]);
  });
});
