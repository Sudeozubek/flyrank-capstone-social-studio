import { describe, expect, it } from "vitest";
import { isPlatform, PLATFORMS } from "@/domain/entities";

describe("platform type guard", () => {
  it("accepts known platforms", () => {
    for (const platform of PLATFORMS) {
      expect(isPlatform(platform)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isPlatform("linkedin")).toBe(false);
    expect(isPlatform("")).toBe(false);
    expect(isPlatform("Instagram")).toBe(false);
  });

  it("lists exactly instagram and x", () => {
    expect([...PLATFORMS].sort()).toEqual(["instagram", "x"]);
  });
});
