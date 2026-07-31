import { describe, expect, it } from "vitest";
import { imageRenderer } from "@/infrastructure/imaging/renderers.server";

/** Reads width/height straight out of the PNG IHDR chunk — no library trust. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  expect([...bytes.slice(0, 8)]).toEqual(sig);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("image renderer emits real PNG artifacts", () => {
  it("renders exact platform dimensions", async () => {
    const renderer = imageRenderer;
    for (const [platform, expected] of [
      ["instagram", { width: 1080, height: 1080 }],
      ["x", { width: 1600, height: 900 }],
    ] as const) {
      const out = await renderer.render({
        platform,
        title: "Durable scheduling for social publishing",
        seed: `seed-${platform}`,
        brand: "CampaignHub",
      });
      expect(out.contentType).toBe("image/png");
      expect(pngSize(out.bytes)).toEqual(expected);
    }
  });
});
