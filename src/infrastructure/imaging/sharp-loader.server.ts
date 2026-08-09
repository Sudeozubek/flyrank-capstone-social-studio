/**
 * Optional `sharp` loader, shared by the renderer and the resizer.
 *
 * The Worker build has no native binary, so the import must stay invisible to
 * static bundler analysis and must fail soft — callers fall back to Jimp.
 * Typed structurally rather than against `sharp`'s own types, which are not
 * installed in the serverless build.
 */

export interface SharpPipeline {
  resize(
    width: number,
    height: number,
    options?: { fit?: string; position?: string },
  ): SharpPipeline;
  png(): SharpPipeline;
  toBuffer(): Promise<Buffer>;
}

export type SharpModule = (input: Buffer) => SharpPipeline;

export async function loadSharp(): Promise<SharpModule | null> {
  if (process.env["FLYRANK_DISABLE_SHARP"] === "1") return null;
  try {
    const specifier = ["sh", "arp"].join("");
    const mod = await import(/* @vite-ignore */ specifier);
    return (mod.default ?? mod) as SharpModule;
  } catch {
    return null;
  }
}
