import { describe, expect, it } from "vitest";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { composeCaption } from "@/domain/captions";
import {
  MAX_PUBLISH_ATTEMPTS,
  backoffSeconds,
  buildIdempotencyKey,
  deriveCampaignStatus,
} from "@/domain/entities";
import type { SocialPostEntry } from "@/domain/entities";
import {
  computeVariantGeometry,
  defaultSourceImage,
  fitSubjectToSafeZone,
} from "@/domain/image-composition";

const post = {
  id: "post-1",
  title: "Durable scheduling for social publishing",
  body: "Publishing at scale is a reliability problem. Retries must not duplicate posts. Leases make a crashed worker safe. Idempotency keys collapse replays into one remote post.",
  url: "https://example.com/durable-scheduling",
};

describe("image geometry", () => {
  it("produces exact per-platform output dimensions", () => {
    const ig = computeVariantGeometry(defaultSourceImage(), "instagram");
    const x = computeVariantGeometry(defaultSourceImage(), "x");
    expect([ig.width, ig.height]).toEqual([1080, 1080]);
    expect([x.width, x.height]).toEqual([1600, 900]);
  });

  it("keeps the subject inside the safe zone after fitting", () => {
    for (const platform of ["instagram", "x"] as const) {
      const geometry = computeVariantGeometry(defaultSourceImage(), platform);
      const subject = fitSubjectToSafeZone(geometry);
      const safe = geometry.safeZone;
      expect(subject.x).toBeGreaterThanOrEqual(safe.x - 0.5);
      expect(subject.y).toBeGreaterThanOrEqual(safe.y - 0.5);
      expect(subject.x + subject.width).toBeLessThanOrEqual(safe.x + safe.width + 0.5);
      expect(subject.y + subject.height).toBeLessThanOrEqual(safe.y + safe.height + 0.5);
    }
  });

  it("preserves the target aspect ratio when cropping", () => {
    const x = computeVariantGeometry(defaultSourceImage(), "x");
    expect(x.crop.sw / x.crop.sh).toBeCloseTo(1600 / 900, 5);
  });
});

describe("captions", () => {
  const ig = composeCaption(post, "instagram");
  const x = composeCaption(post, "x");

  it("respects each platform's hard length limit", () => {
    expect(ig.length).toBeLessThanOrEqual(PLATFORM_SPECS.instagram.maxCaptionLength);
    expect(x.length).toBeLessThanOrEqual(PLATFORM_SPECS.x.maxCaptionLength);
  });

  it("diverges structurally — neither caption is a truncation of the other", () => {
    expect(ig).not.toEqual(x);
    expect(ig.startsWith(x.slice(0, 40))).toBe(false);
    expect(x.startsWith(ig.slice(0, 40))).toBe(false);
  });

  it("respects the per-platform hashtag budget", () => {
    const count = (s: string) => (s.match(/#\w+/g) ?? []).length;
    expect(count(ig)).toBeLessThanOrEqual(PLATFORM_SPECS.instagram.maxHashtags);
    expect(count(x)).toBeLessThanOrEqual(PLATFORM_SPECS.x.maxHashtags);
    expect(count(ig)).toBeGreaterThan(count(x));
  });

  it("is deterministic for the same post and platform", () => {
    expect(composeCaption(post, "instagram")).toEqual(ig);
  });
});

describe("publish reliability primitives", () => {
  it("derives a deterministic idempotency key per (campaign, platform)", () => {
    expect(buildIdempotencyKey("c1", "x")).toEqual(buildIdempotencyKey("c1", "x"));
    expect(buildIdempotencyKey("c1", "x")).not.toEqual(buildIdempotencyKey("c1", "instagram"));
  });

  it("honours Retry-After above the exponential floor and caps growth", () => {
    expect(backoffSeconds(1)).toBe(5);
    expect(backoffSeconds(2)).toBe(10);
    expect(backoffSeconds(1, 42)).toBe(42);
    expect(backoffSeconds(20)).toBeLessThanOrEqual(300);
    expect(MAX_PUBLISH_ATTEMPTS).toBeGreaterThan(1);
  });

  it("derives campaign status from its entries", () => {
    const entry = (status: SocialPostEntry["status"]) => ({ status }) as SocialPostEntry;
    expect(deriveCampaignStatus([])).toBe("draft");
    expect(deriveCampaignStatus([entry("published"), entry("published")])).toBe("completed");
    expect(deriveCampaignStatus([entry("publishing"), entry("queued")])).toBe("publishing");
    expect(deriveCampaignStatus([entry("failed"), entry("failed")])).toBe("failed");
    expect(deriveCampaignStatus([entry("published"), entry("queued")])).toBe("scheduled");
  });
});
