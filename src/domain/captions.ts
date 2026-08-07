/**
 * Caption composer — pure. (post, platform) -> tailored caption assembled from
 * shared brand voice + platform overrides. X, Instagram and LinkedIn diverge in
 * structure, tone, length and hashtag count; neither is a truncation of the other.
 */

import { resolveCampaignLanguage } from "@/config/campaign-languages.config";
import { resolveBrandTone } from "@/config/brand-tones.config";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORM_VOICE, SHARED_VOICE } from "@/config/social-prompts.config";
import type { BrandContext, Platform } from "./entities";

export interface CaptionSource {
  id: string;
  title: string;
  body: string;
  url?: string | null;
}

/** Deterministic 32-bit hash — keeps fragment choice stable per post. */
export function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: string): T {
  return items[stableHash(seed) % items.length]!;
}

export function splitSentences(body: string): string[] {
  return body
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function summarize(body: string, sentences: number): string {
  return splitSentences(body).slice(0, sentences).join(" ");
}

function formatHashtags(tags: string[], max: number): string {
  return tags
    .slice(0, max)
    .map((t) => `#${t.replace(/^#/, "")}`)
    .join(" ");
}

/** Hard character cap for a platform caption (spec limit ∩ voice target). */
export function captionLimit(platform: Platform): number {
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;
  return Math.min(spec.maxCaptionLength, voice.targetLength);
}

/** Trim to a limit on a word boundary, never mid-word. */
export function clamp(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * Fit text within a limit while preferring complete sentences.
 * For X, ellipsis is avoided so posts never feel cut off mid-thought.
 */
export function fitCaptionToLimit(
  text: string,
  limit: number,
  options: { allowEllipsis?: boolean; preserveLineBreaks?: boolean } = {},
): string {
  const normalized = options.preserveLineBreaks
    ? text.replace(/[ \t]+\n/g, "\n").replace(/[^\S\n]{2,}/g, " ").trim()
    : text.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) return normalized;

  if (options.preserveLineBreaks) {
    return clamp(normalized, limit);
  }

  const allowEllipsis = options.allowEllipsis ?? false;
  const slice = normalized.slice(0, limit);

  for (const marker of [". ", "! ", "? ", "… ", ".", "!", "?"]) {
    const idx = slice.lastIndexOf(marker);
    if (idx >= Math.floor(limit * 0.4)) {
      const end = marker.trim().length === 1 && marker !== "…" ? idx + 1 : idx;
      const candidate = slice.slice(0, end).trim();
      if (candidate.length > 0) return candidate;
    }
  }

  const boundary = slice.lastIndexOf(" ");
  if (boundary >= Math.floor(limit * 0.5)) {
    return slice.slice(0, boundary).trim();
  }

  return allowEllipsis ? clamp(normalized, limit) : slice.trim();
}

export function summarizeToLength(body: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  const sentences = splitSentences(body);
  let result = "";
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length > maxChars) break;
    result = next;
  }
  if (result) return result;
  const first = sentences[0] ?? body;
  return fitCaptionToLimit(first, maxChars, { allowEllipsis: false });
}

export function shortenTitleForX(title: string, max: number): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;

  const colon = trimmed.indexOf(":");
  if (colon > 0 && colon < max - 8) {
    const head = trimmed.slice(0, colon + 1).trim();
    const rest = trimmed.slice(colon + 1).trim();
    const restBudget = max - head.length - 1;
    if (restBudget > 10) {
      const shortRest = fitCaptionToLimit(rest, restBudget, { allowEllipsis: false });
      const combined = `${head} ${shortRest}`.trim();
      if (combined.length <= max) return combined;
    }
    if (head.length <= max) return head;
  }

  return fitCaptionToLimit(trimmed, max, { allowEllipsis: false });
}

function composeXCaption(
  post: CaptionSource,
  seed: string,
  hashtags: string,
  ctas: readonly string[],
  limit: number,
): string {
  const cta = pick(ctas, seed);
  const url = post.url ?? "";
  const tail = [cta, url, hashtags].filter(Boolean).join(" ");
  const tailBudget = tail.length > 0 ? tail.length + 1 : 0;
  const bodyBudget = Math.max(48, limit - tailBudget);

  const titleMax = Math.min(80, Math.floor(bodyBudget * 0.45));
  const title = shortenTitleForX(post.title, titleMax);
  const summaryMax = Math.max(32, bodyBudget - title.length - 1);
  const summary = summarizeToLength(post.body, summaryMax);

  let core = `${title} ${summary}`.replace(/\s+/g, " ").trim();
  if (core.length + tailBudget > limit) {
    const tighterSummary = summarizeToLength(
      post.body,
      Math.max(24, summaryMax - (core.length + tailBudget - limit)),
    );
    core = `${title} ${tighterSummary}`.replace(/\s+/g, " ").trim();
  }

  const caption = tail ? `${core} ${tail}` : core;
  return fitCaptionToLimit(caption.replace(/\s+/g, " ").trim(), limit, { allowEllipsis: false });
}

export function composeCaption(
  post: CaptionSource,
  platform: Platform,
  brand?: BrandContext,
): string {
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;
  const seed = `${post.id}:${platform}`;
  const brandName = brand?.name?.trim() || SHARED_VOICE.brandName;
  const withBrand = (text: string) => text.replaceAll("{brand}", brandName);
  const tone = resolveBrandTone(brand?.tone);
  const language = resolveCampaignLanguage(brand?.language);
  const useToneFragments = tone && language.id === "en";
  const hooks = (useToneFragments ? tone.hooks : language.hooks) ?? SHARED_VOICE.hooks;
  const valueProps = (useToneFragments ? tone.valueProps : language.valueProps) ?? SHARED_VOICE.valueProps;
  const ctas = (useToneFragments ? tone.ctas[platform] : language.ctas[platform]) ?? voice.ctas;
  const signOff = (useToneFragments ? tone.signOff : language.signOff) ?? SHARED_VOICE.signOff;

  const hashtags = formatHashtags(
    [...SHARED_VOICE.baseHashtags, ...voice.hashtags],
    Math.min(spec.maxHashtags, voice.hashtags.length + SHARED_VOICE.baseHashtags.length),
  );

  let summary = summarize(post.body, voice.summarySentences);
  if (!voice.emoji) summary = summary.replace(/\p{Extended_Pictographic}/gu, "").trim();

  if (platform === "x") {
    return composeXCaption(post, seed, hashtags, ctas, captionLimit(platform));
  }

  const filled = voice.template
    .replace("{hook}", withBrand(pick(hooks, seed)))
    .replace("{title}", platform === "instagram" ? post.title.toUpperCase() : post.title)
    .replace("{summary}", summary)
    .replace("{value}", pick(valueProps, seed))
    .replace("{cta}", pick(ctas, seed))
    .replace("{url}", post.url ?? "")
    .replace("{signOff}", withBrand(signOff))
    .replace("{hashtags}", hashtags)
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const normalized = voice.lineBreaks ? filled : filled.replace(/\s*\n+\s*/g, " ");
  return fitCaptionToLimit(normalized, captionLimit(platform), {
    allowEllipsis: true,
    preserveLineBreaks: voice.lineBreaks,
  });
}
