import { describe, expect, it } from "vitest";
import { PLATFORM_SPECS } from "@/config/platform-specs";
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

describe("composeCaption brand substitution", () => {
  it("replaces {brand} with the provided brand name", () => {
    const caption = composeCaption(post, "instagram", { name: "Acme Corp" });
    expect(caption.toLowerCase()).toContain("acme");
  });

  it("respects platform length limits after brand substitution", () => {
    for (const platform of ["instagram", "x"] as const) {
      const caption = composeCaption(post, platform, { name: "Very Long Brand Name International" });
      expect(caption.length).toBeLessThanOrEqual(PLATFORM_SPECS[platform].maxCaptionLength);
    }
  });
});
