/**
 * Caption composer — pure. (post, platform) -> tailored caption assembled from
 * shared brand voice + platform overrides. X and Instagram diverge in
 * structure, tone, length and hashtag count; neither is a truncation of the other.
 */

import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORM_VOICE, SHARED_VOICE } from "@/config/social-prompts.config";
import type { Platform } from "./entities";

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

/** Trim to a limit on a word boundary, never mid-word. */
export function clamp(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const boundary = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

export function composeCaption(post: CaptionSource, platform: Platform): string {
  const spec = PLATFORM_SPECS[platform];
  const voice = PLATFORM_VOICE[platform];
  const seed = `${post.id}:${platform}`;

  const hashtags = formatHashtags(
    [...SHARED_VOICE.baseHashtags, ...voice.hashtags],
    Math.min(spec.maxHashtags, voice.hashtags.length + SHARED_VOICE.baseHashtags.length),
  );

  let summary = summarize(post.body, voice.summarySentences);
  if (!voice.emoji) summary = summary.replace(/\p{Extended_Pictographic}/gu, "").trim();

  const filled = voice.template
    .replace("{hook}", pick(SHARED_VOICE.hooks, seed))
    .replace("{title}", platform === "x" ? post.title : post.title.toUpperCase())
    .replace("{summary}", summary)
    .replace("{value}", pick(SHARED_VOICE.valueProps, seed))
    .replace("{cta}", pick(voice.ctas, seed))
    .replace("{url}", post.url ?? "")
    .replace("{signOff}", SHARED_VOICE.signOff)
    .replace("{hashtags}", hashtags)
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  const normalized = voice.lineBreaks ? filled : filled.replace(/\s*\n+\s*/g, " ");
  return clamp(normalized, Math.min(spec.maxCaptionLength, voice.targetLength));
}
