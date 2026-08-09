/**
 * ImageRenderer adapters — real PNG artifacts, no hand-rolled encoder.
 *
 * `sharp` is the primary renderer (rasterises the shared SVG composition,
 * text included) and is used whenever a native Node runtime is available:
 * local `npm run dev`, Docker, and the test suite. The deployed target is a
 * serverless Worker where sharp's native binary cannot load, so `Jimp`
 * (pure JS) renders the same geometry there. Both emit byte-real PNGs at
 * exactly the platform dimensions.
 */

import { composeVariant } from "@/domain/image-composition";
import type { ImageRenderer, RenderedImage } from "@/domain/ports";
import { loadSharp } from "./sharp-loader.server";

type RenderSpec = Parameters<ImageRenderer["render"]>[0];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

export const sharpRenderer: ImageRenderer = {
  name: "sharp",
  async render(spec: RenderSpec): Promise<RenderedImage> {
    const sharp = await loadSharp();
    if (!sharp) throw new Error("sharp is not available in this runtime");
    const { svg } = composeVariant({
      platform: spec.platform,
      title: spec.title,
      seed: spec.seed,
      brand: spec.brand,
    });
    const buffer: Buffer = await sharp(Buffer.from(svg))
      .resize(spec.width, spec.height, { fit: "fill" })
      .png()
      .toBuffer();
    return {
      bytes: new Uint8Array(buffer),
      width: spec.width,
      height: spec.height,
      contentType: "image/png",
      renderer: "sharp",
    };
  },
};

export const jimpRenderer: ImageRenderer = {
  name: "jimp",
  async render(spec: RenderSpec): Promise<RenderedImage> {
    const { Jimp } = await import("jimp");
    const composition = composeVariant({
      platform: spec.platform,
      title: spec.title,
      seed: spec.seed,
      brand: spec.brand,
    });
    const { width, height } = spec;
    const image = new Jimp({ width, height, color: 0x000000ff });
    const data = image.bitmap.data;

    const hue = composition.hue;
    const from = hslToRgb(hue, 0.42, 0.12);
    const to = hslToRgb((hue + 48) % 360, 0.55, 0.26);
    const subjectFrom = hslToRgb((hue + 200) % 360, 0.9, 0.7);
    const subjectTo = hslToRgb((hue + 160) % 360, 0.8, 0.42);
    const s = composition.subject;
    const radius = s.width * 0.12;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = (x / width + y / height) / 2;
        let r = from[0] + (to[0] - from[0]) * t;
        let g = from[1] + (to[1] - from[1]) * t;
        let b = from[2] + (to[2] - from[2]) * t;

        const inX = x >= s.x && x <= s.x + s.width;
        const inY = y >= s.y && y <= s.y + s.height;
        if (inX && inY) {
          // Rounded-corner test keeps the subject shape identical to the SVG.
          const cx = Math.min(Math.max(x, s.x + radius), s.x + s.width - radius);
          const cy = Math.min(Math.max(y, s.y + radius), s.y + s.height - radius);
          const dist = Math.hypot(x - cx, y - cy);
          if (dist <= radius) {
            const u = ((x - s.x) / s.width + (y - s.y) / s.height) / 2;
            r = subjectFrom[0] + (subjectTo[0] - subjectFrom[0]) * u;
            g = subjectFrom[1] + (subjectTo[1] - subjectFrom[1]) * u;
            b = subjectFrom[2] + (subjectTo[2] - subjectFrom[2]) * u;
          }
        }

        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }

    const buffer = await image.getBuffer("image/png");
    return {
      bytes: new Uint8Array(buffer),
      width,
      height,
      contentType: "image/png",
      renderer: "jimp",
    };
  },
};

/**
 * One port, two adapters: prefer sharp, fall back to Jimp on runtimes without
 * native modules. Callers never learn which one ran.
 */
export const svgImageRenderer: ImageRenderer = {
  name: "svg",
  async render(spec) {
    const sharp = await loadSharp();
    return sharp ? sharpRenderer.render(spec) : jimpRenderer.render(spec);
  },
};

/** @deprecated Use svgImageRenderer — kept for tests and explicit SVG-only paths. */
export const imageRenderer = svgImageRenderer;

/** Decoded PNG header dimensions — used by tests and by the upload path. */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) throw new Error("Not a PNG");
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
