/**
 * Wk3 — Platform specs.
 * Single source of truth for image geometry + hard platform limits.
 * Consumed by the image-variant pipeline, the caption composer and the UI.
 */

export const PLATFORMS = ["instagram", "x"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface SafeZone {
  /** Fractions (0..1) of the target frame that must stay free of the subject. */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlatformSpec {
  id: Platform;
  label: string;
  /** Output pixel dimensions of the rendered variant. */
  width: number;
  height: number;
  aspectLabel: string;
  safeZone: SafeZone;
  /** Hard caption limit enforced by the composer. */
  maxCaptionLength: number;
  maxHashtags: number;
  /** Corner used for the brand overlay. */
  brandCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    width: 1080,
    height: 1080,
    aspectLabel: "1:1",
    safeZone: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
    maxCaptionLength: 2200,
    maxHashtags: 8,
    brandCorner: "bottom-right",
  },
  x: {
    id: "x",
    label: "X",
    width: 1600,
    height: 900,
    aspectLabel: "16:9",
    safeZone: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
    maxCaptionLength: 280,
    maxHashtags: 2,
    brandCorner: "bottom-right",
  },
};

export const platformSpecList = PLATFORMS.map((p) => PLATFORM_SPECS[p]);

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}
