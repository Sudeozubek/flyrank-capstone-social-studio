/**
 * Resize generated PNG bytes to exact platform dimensions (cover crop).
 */

/** Defeat static bundler analysis: the Worker build must not try to resolve sharp. */
async function loadSharp(): Promise<any | null> {
  if (process.env["FLYRANK_DISABLE_SHARP"] === "1") return null;
  try {
    const specifier = ["sh", "arp"].join("");
    const mod = await import(/* @vite-ignore */ specifier);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

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
  const image = await Jimp.read(bytes);
  image.cover({ w: width, h: height });
  const buffer = await image.getBuffer("image/png");
  return new Uint8Array(buffer);
}
