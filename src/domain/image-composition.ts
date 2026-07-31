/**
 * Image composition — pure crop/scale geometry plus a deterministic SVG
 * composition. Renderers (sharp / Jimp) rasterise this to real PNG bytes;
 * the maths here is fully unit-testable and framework-free.
 */

import { PLATFORM_SPECS, type PlatformSpec } from "@/config/platform-specs";
import type { Platform } from "./entities";

export interface SourceImage {
  width: number;
  height: number;
  /** Subject bounding box in source pixels — must survive the crop. */
  subject: { x: number; y: number; width: number; height: number };
}

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VariantGeometry {
  platform: Platform;
  width: number;
  height: number;
  crop: CropRect;
  subjectInOutput: Box;
  safeZone: Box;
  subjectWithinSafeZone: boolean;
}

const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function safeZoneBox(spec: PlatformSpec): Box {
  const x = spec.width * spec.safeZone.left;
  const y = spec.height * spec.safeZone.top;
  return {
    x,
    y,
    width: spec.width * (1 - spec.safeZone.left - spec.safeZone.right),
    height: spec.height * (1 - spec.safeZone.top - spec.safeZone.bottom),
  };
}

/** Aspect-preserving centre-on-subject crop for the target platform. */
export function computeVariantGeometry(source: SourceImage, platform: Platform): VariantGeometry {
  const spec = PLATFORM_SPECS[platform]!;
  const targetAr = spec.width / spec.height;
  const sourceAr = source.width / source.height;

  let sw = source.width;
  let sh = source.height;
  if (sourceAr > targetAr) sw = source.height * targetAr;
  else sh = source.width / targetAr;

  const subjectCx = source.subject.x + source.subject.width / 2;
  const subjectCy = source.subject.y + source.subject.height / 2;
  const sx = clampNum(subjectCx - sw / 2, 0, source.width - sw);
  const sy = clampNum(subjectCy - sh / 2, 0, source.height - sh);

  const scale = spec.width / sw;
  const subjectInOutput: Box = {
    x: (source.subject.x - sx) * scale,
    y: (source.subject.y - sy) * scale,
    width: source.subject.width * scale,
    height: source.subject.height * scale,
  };

  const safe = safeZoneBox(spec);
  const subjectWithinSafeZone =
    subjectInOutput.x >= safe.x - 0.5 &&
    subjectInOutput.y >= safe.y - 0.5 &&
    subjectInOutput.x + subjectInOutput.width <= safe.x + safe.width + 0.5 &&
    subjectInOutput.y + subjectInOutput.height <= safe.y + safe.height + 0.5;

  return {
    platform,
    width: spec.width,
    height: spec.height,
    crop: { sx, sy, sw, sh },
    subjectInOutput,
    safeZone: safe,
    subjectWithinSafeZone,
  };
}

export function defaultSourceImage(): SourceImage {
  return { width: 1600, height: 1600, subject: { x: 480, y: 480, width: 640, height: 640 } };
}

/** Scale + recentre the subject until it provably fits the safe zone. */
export function fitSubjectToSafeZone(geometry: VariantGeometry): Box {
  const { safeZone: safe, subjectInOutput: subj } = geometry;
  const scale = Math.min(1, safe.width / subj.width, safe.height / subj.height);
  const width = subj.width * scale;
  const height = subj.height * scale;
  return {
    width,
    height,
    x: clampNum(safe.x + (safe.width - width) / 2, safe.x, safe.x + safe.width - width),
    y: clampNum(safe.y + (safe.height - height) / 2, safe.y, safe.y + safe.height - height),
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export interface CompositionInput {
  platform: Platform;
  title: string;
  seed: string;
  brand: string;
  showGuides?: boolean;
}

export interface Composition {
  spec: PlatformSpec;
  geometry: VariantGeometry;
  subject: Box;
  hue: number;
  lines: string[];
  svg: string;
}

export function composeVariant(input: CompositionInput): Composition {
  const spec = PLATFORM_SPECS[input.platform]!;
  const geometry = computeVariantGeometry(defaultSourceImage(), input.platform);
  const subject = fitSubjectToSafeZone(geometry);
  const safe = geometry.safeZone;
  const h = hueFor(input.seed);
  const titleSize = Math.round(spec.width * (input.platform === "x" ? 0.05 : 0.062));

  const words = input.title.split(/\s+/).filter(Boolean);
  const perLine = input.platform === "x" ? 5 : 3;
  const lines: string[] = [];
  for (let i = 0; i < words.length && lines.length < 3; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(" "));
  }

  const brandX = spec.brandCorner.endsWith("right") ? safe.x + safe.width : safe.x;
  const brandAnchor = spec.brandCorner.endsWith("right") ? "end" : "start";
  const brandY = spec.brandCorner.startsWith("bottom") ? safe.y + safe.height : safe.y + 24;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}" role="img" aria-label="${esc(input.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${h} 42% 12%)"/>
      <stop offset="100%" stop-color="hsl(${(h + 48) % 360} 55% 26%)"/>
    </linearGradient>
    <radialGradient id="subject" cx="0.35" cy="0.3">
      <stop offset="0%" stop-color="hsl(${(h + 200) % 360} 90% 70%)"/>
      <stop offset="100%" stop-color="hsl(${(h + 160) % 360} 80% 42%)"/>
    </radialGradient>
  </defs>
  <rect width="${spec.width}" height="${spec.height}" fill="url(#bg)"/>
  <rect x="${subject.x.toFixed(1)}" y="${subject.y.toFixed(1)}" width="${subject.width.toFixed(1)}" height="${subject.height.toFixed(1)}" rx="${(subject.width * 0.12).toFixed(1)}" fill="url(#subject)" opacity="0.92"/>
  ${input.showGuides ? `<rect x="${safe.x}" y="${safe.y}" width="${safe.width}" height="${safe.height}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-dasharray="12 12"/>` : ""}
  <g font-family="Georgia, 'Times New Roman', serif" fill="#ffffff">
    ${lines
      .map(
        (line, i) =>
          `<text x="${safe.x + 8}" y="${safe.y + titleSize * (1.15 + i * 1.2)}" font-size="${titleSize}" font-weight="700">${esc(line)}</text>`,
      )
      .join("\n    ")}
  </g>
  <text x="${brandX}" y="${brandY}" text-anchor="${brandAnchor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${Math.round(spec.width * 0.026)}" letter-spacing="4" fill="#ffffff" fill-opacity="0.85">${esc(input.brand.toUpperCase())} · ${spec.aspectLabel}</text>
</svg>`;

  return { spec, geometry, subject, hue: h, lines, svg };
}
