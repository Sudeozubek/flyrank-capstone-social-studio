import { describe, expect, it } from "vitest";
import { brandToneInputSchema, resolveBrandTone } from "@/config/brand-tones.config";

describe("brandToneInputSchema", () => {
  it("accepts a known tone id", () => {
    expect(brandToneInputSchema.parse("friendly")).toBe("friendly");
  });

  it("normalizes empty string to null", () => {
    expect(brandToneInputSchema.parse("")).toBeNull();
    expect(brandToneInputSchema.parse(undefined)).toBeNull();
    expect(brandToneInputSchema.parse(null)).toBeNull();
  });

  it("rejects unknown tone values", () => {
    expect(() => brandToneInputSchema.parse("custom tone")).toThrow();
  });
});

describe("resolveBrandTone", () => {
  it("returns tone metadata for a valid id", () => {
    expect(resolveBrandTone("professional")?.label).toBe("Professional");
  });
});
