/**
 * Platform specs — single source of truth for output geometry and hard limits.
 * Pure config consumed by the image pipeline, the caption composer and the UI.
 */

import type { Platform } from "@/domain/entities";
import { PLATFORMS } from "@/domain/entities";

export interface SafeZone {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlatformSpec {
  id: Platform;
  label: string;
  width: number;
  height: number;
  aspectLabel: string;
  safeZone: SafeZone;
  maxCaptionLength: number;
  maxHashtags: number;
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
