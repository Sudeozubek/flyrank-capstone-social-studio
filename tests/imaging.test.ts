import { describe, expect, it } from "vitest";
import { svgImageRenderer } from "@/infrastructure/imaging/renderers.server";

/** Reads width/height straight out of the PNG IHDR chunk — no library trust. */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  expect([...bytes.slice(0, 8)]).toEqual(sig);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("image renderer emits real PNG artifacts", () => {
  it("renders exact platform dimensions", async () => {
    const renderer = svgImageRenderer;
    for (const [platform, expected] of [
      ["instagram", { width: 1080, height: 1080 }],
      ["x", { width: 1600, height: 900 }],
    ] as const) {
      const out = await renderer.render({
        platform,
        width: expected.width,
        height: expected.height,
        title: "Durable scheduling for social publishing",
        body: "Retries must not duplicate posts. Leases make a crashed worker safe.",
        seed: `seed-${platform}`,
        brand: "CampaignHub",
        subject: { x: 120, y: 120, width: 840, height: 840 },
      });
      expect(out.contentType).toBe("image/png");
      expect(pngSize(out.bytes)).toEqual(expected);
    }
  });
});
