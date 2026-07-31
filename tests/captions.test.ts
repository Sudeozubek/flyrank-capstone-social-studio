import { describe, expect, it } from "vitest";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { composeCaption } from "@/lib/captions";
import type { BlogPost } from "@/lib/types";

const post: BlogPost = {
  id: "post_test",
  title: "Building a crash-safe publishing worker",
  body: "Scheduling is easy. Surviving a restart is not. Leases plus idempotency keys make replay safe. The worker resumes without duplicating anything.",
  url: "https://flyrank.example/blog/test",
  createdAt: new Date().toISOString(),
};

describe("caption composer", () => {
  it("respects each platform's hard length limit", () => {
    for (const platform of ["x", "instagram"] as const) {
      expect(composeCaption(post, platform).length).toBeLessThanOrEqual(
        PLATFORM_SPECS[platform].maxCaptionLength,
      );
    }
  });

  it("produces structurally different output per platform, not a truncation", () => {
    const x = composeCaption(post, "x");
    const ig = composeCaption(post, "instagram");
    expect(x).not.toEqual(ig);
    expect(ig.length).toBeGreaterThan(x.length * 1.5);
    expect(x).not.toContain("\n");
    expect(ig).toContain("\n");
    expect(ig.startsWith(x.slice(0, 40))).toBe(false);
  });

  it("honours the hashtag budget per platform", () => {
    const count = (s: string) => (s.match(/#\w+/g) ?? []).length;
    expect(count(composeCaption(post, "x"))).toBeLessThanOrEqual(PLATFORM_SPECS.x.maxHashtags);
    expect(count(composeCaption(post, "instagram"))).toBeLessThanOrEqual(
      PLATFORM_SPECS.instagram.maxHashtags,
    );
  });

  it("is deterministic for the same post", () => {
    expect(composeCaption(post, "instagram")).toEqual(composeCaption(post, "instagram"));
  });
});
