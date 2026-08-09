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

interface VoiceFragments {
  hooks: readonly string[];
  valueProps: readonly string[];
  ctas: readonly string[];
  signOff: string;
}

/** Merge brand tone (style) with campaign language (locale) for any language. */
function resolveVoiceFragments(
  brand: BrandContext | undefined,
  platform: Platform,
): VoiceFragments {
  const tone = resolveBrandTone(brand?.tone);
  const language = resolveCampaignLanguage(brand?.language);
  const voice = PLATFORM_VOICE[platform]!;

  return {
    hooks: tone?.hooks ?? (language.id === "en" ? SHARED_VOICE.hooks : language.hooks),
    valueProps:
      tone?.valueProps ?? (language.id === "en" ? SHARED_VOICE.valueProps : language.valueProps),
    ctas: tone?.ctas[platform] ?? language.ctas[platform] ?? voice.ctas,
    signOff: tone?.signOff ?? (language.id === "en" ? SHARED_VOICE.signOff : language.signOff),
  };
}

function selectSentence(sentences: readonly string[], seed: string): string | null {
  if (sentences.length === 0) return null;
  return pick(sentences, seed);
}

function shortenLead(sentence: string, maxLen: number): string {
  const cleaned = sentence.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return fitCaptionToLimit(cleaned, maxLen, { allowEllipsis: false });
}

/**
 * Opener priority: article sentence (55%) → title angle (25%) → tone/language hook (20%).
 * Keeps captions tied to the source post instead of a generic "we published" line.
 */
export function buildHook(
  post: CaptionSource,
  platform: Platform,
  seed: string,
  hooks: readonly string[],
  brandName: string,
): string {
  const withBrand = (text: string) => text.replaceAll("{brand}", brandName);
  const sentences = splitSentences(post.body);
  const strategy = stableHash(`${seed}:hook-strategy`) % 100;
  const leadMax = platform === "x" ? 100 : 140;

  if (strategy < 55) {
    const sentence = selectSentence(sentences, `${seed}:hook-sent`);
    if (sentence) {
      const lead = shortenLead(sentence, leadMax);
      if (lead.length >= 20) return lead;
    }
  }

  if (strategy < 80) {
    const title = post.title.trim();
    if (title.length >= 12) {
      return title.length <= leadMax ? title : shortenLead(title, leadMax);
    }
  }

  return withBrand(pick(hooks, `${seed}:template-hook`));
}

/** Pull a takeaway from the article body; fall back to tone/language value props. */
export function buildTakeaway(
  post: CaptionSource,
  seed: string,
  valueProps: readonly string[],
): string {
  const sentences = splitSentences(post.body);
  if (sentences.length >= 2) {
    const start = stableHash(`${seed}:takeaway`) % sentences.length;
    for (let offset = 0; offset < sentences.length; offset++) {
      const candidate = sentences[(start + offset) % sentences.length]!;
      if (candidate.length >= 24 && candidate.length <= 200) return candidate;
    }
  }
  return pick(valueProps, `${seed}:value-fallback`);
}

function maybeEmojiSuffix(hook: string, seed: string, enabled: boolean): string {
  if (!enabled || stableHash(`${seed}:emoji`) % 3 !== 0) return hook;
  return hook.endsWith("✨") ? hook : `${hook} ✨`;
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
    ? text
        .replace(/[ \t]+\n/g, "\n")
        .replace(/[^\S\n]{2,}/g, " ")
        .trim()
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

function compressForX(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const parts = text.split("\n\n").filter(Boolean);
  if (parts.length <= 1) {
    return fitCaptionToLimit(text, limit, { allowEllipsis: false, preserveLineBreaks: true });
  }

  const tail = parts[parts.length - 1]!;
  const bodyParts = parts.slice(0, -1);

  while (bodyParts.join("\n\n").length + 2 + tail.length > limit && bodyParts.length > 1) {
    const last = bodyParts.pop()!;
    if (last.length > 48) {
      bodyParts.push(
        fitCaptionToLimit(last, Math.max(32, last.length - 24), { allowEllipsis: false }),
      );
    }
  }

  const result = [...bodyParts, tail].join("\n\n");
  return fitCaptionToLimit(result, limit, { allowEllipsis: false, preserveLineBreaks: true });
}

/** Use spare X character budget for an extra article sentence when possible. */
function fillXCaption(post: CaptionSource, caption: string, limit: number): string {
  if (caption.length >= limit - 18) return caption;

  const parts = caption.split("\n\n");
  if (parts.length < 3) return caption;

  const summaryIdx = 1;
  let summary = parts[summaryIdx] ?? "";
  for (const sentence of splitSentences(post.body)) {
    if (summary.includes(sentence)) continue;
    const next = summary ? `${summary} ${sentence}` : sentence;
    const trial = [...parts];
    trial[summaryIdx] = next;
    const joined = trial.join("\n\n");
    if (joined.length > limit) break;
    summary = next;
    parts[summaryIdx] = summary;
  }

  return parts.join("\n\n");
}

function composeXCaption(
  post: CaptionSource,
  seed: string,
  hashtags: string,
  ctas: readonly string[],
  hook: string,
  summary: string,
  takeaway: string,
  limit: number,
): string {
  const cta = pick(ctas, seed);
  const url = post.url ?? "";
  const tail = [cta, url, hashtags].filter(Boolean).join(" ");
  const filled = [hook, summary, takeaway, tail].filter(Boolean).join("\n\n");
  const expanded = fillXCaption(post, filled, limit);
  return compressForX(expanded, limit);
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
  const fragments = resolveVoiceFragments(brand, platform);

  const hashtags = formatHashtags(
    [...SHARED_VOICE.baseHashtags, ...voice.hashtags],
    Math.min(spec.maxHashtags, voice.hashtags.length + SHARED_VOICE.baseHashtags.length),
  );

  let summary = summarize(post.body, voice.summarySentences);
  if (!voice.emoji) summary = summary.replace(/\p{Extended_Pictographic}/gu, "").trim();

  const hook = maybeEmojiSuffix(
    buildHook(post, platform, seed, fragments.hooks, brandName),
    seed,
    voice.emoji,
  );
  const takeaway = buildTakeaway(post, seed, fragments.valueProps);

  if (platform === "x") {
    return composeXCaption(
      post,
      seed,
      hashtags,
      fragments.ctas,
      hook,
      summary,
      takeaway,
      captionLimit(platform),
    );
  }

  const filled = voice.template
    .replace("{hook}", hook)
    .replace("{title}", platform === "instagram" ? post.title.toUpperCase() : post.title)
    .replace("{summary}", summary)
    .replace("{value}", takeaway)
    .replace("{cta}", pick(fragments.ctas, seed))
    .replace("{url}", post.url ?? "")
    .replace("{signOff}", withBrand(fragments.signOff))
    .replace("{hashtags}", hashtags)
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const normalized = voice.lineBreaks ? filled : filled.replace(/\s*\n+\s*/g, " ");
  return fitCaptionToLimit(normalized, captionLimit(platform), {
    allowEllipsis: true,
    preserveLineBreaks: voice.lineBreaks,
  });
}
