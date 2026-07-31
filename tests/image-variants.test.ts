import { describe, expect, it } from "vitest";
import { PLATFORM_SPECS, PLATFORMS } from "@/config/platform-specs";
import {
  computeVariantGeometry,
  defaultSourceImage,
  fitSubjectToSafeZone,
  renderVariantSvg,
} from "@/lib/image-variants";

describe("image variant pipeline", () => {
  it.each(PLATFORMS)("produces exact output dimensions for %s", (platform) => {
    const spec = PLATFORM_SPECS[platform];
    const geometry = computeVariantGeometry(defaultSourceImage(), platform);
    expect(geometry.width).toBe(spec.width);
    expect(geometry.height).toBe(spec.height);
  });

  it.each(PLATFORMS)("crop for %s matches the target aspect ratio", (platform) => {
    const spec = PLATFORM_SPECS[platform];
    const { crop } = computeVariantGeometry(defaultSourceImage(), platform);
    expect(crop.sw / crop.sh).toBeCloseTo(spec.width / spec.height, 5);
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sy).toBeGreaterThanOrEqual(0);
  });

  it.each(PLATFORMS)("keeps the subject inside the safe zone for %s", (platform) => {
    const geometry = computeVariantGeometry(defaultSourceImage(), platform);
    const subject = fitSubjectToSafeZone(geometry);
    const safe = geometry.safeZoneBox;
    expect(subject.x).toBeGreaterThanOrEqual(safe.x - 0.01);
    expect(subject.y).toBeGreaterThanOrEqual(safe.y - 0.01);
    expect(subject.x + subject.width).toBeLessThanOrEqual(safe.x + safe.width + 0.01);
    expect(subject.y + subject.height).toBeLessThanOrEqual(safe.y + safe.height + 0.01);
  });

  it.each(PLATFORMS)("renders SVG at the declared pixel size for %s", (platform) => {
    const spec = PLATFORM_SPECS[platform];
    const svg = renderVariantSvg(platform, { title: "Hello world", seed: "post_1" });
    expect(svg).toContain(`width="${spec.width}"`);
    expect(svg).toContain(`height="${spec.height}"`);
    expect(svg).toContain(`viewBox="0 0 ${spec.width} ${spec.height}"`);
  });

  it("escapes untrusted title text", () => {
    const svg = renderVariantSvg("x", { title: '<script>alert("x")</script>', seed: "s" });
    expect(svg).not.toContain("<script>");
  });
});
