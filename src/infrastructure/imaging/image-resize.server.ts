/**
 * Resize generated PNG bytes to exact platform dimensions (cover crop).
 */

import { loadSharp } from "./sharp-loader.server";

export async function resizePngCover(
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const sharp = await loadSharp();
  if (sharp) {
    const buffer: Buffer = await sharp(Buffer.from(bytes))
      .resize(width, height, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    return new Uint8Array(buffer);
  }

  const { Jimp } = await import("jimp");
  const image = await Jimp.read(Buffer.from(bytes));
  image.cover({ w: width, h: height });
  const buffer = await image.getBuffer("image/png");
  return new Uint8Array(buffer);
}
