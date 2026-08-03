/**
 * CaptionWriter adapter — OpenAI.
 *
 * The prompt composition architecture is unchanged: shared brand voice and
 * per-platform fragments still come from `social-prompts.config.ts` and the
 * hard limits from `platform-specs.ts`. Instead of string-substituting the
 * template deterministically, those fragments are assembled into a system +
 * user prompt and an LLM writes the final platform-specific caption.
 *
 * If the API key is absent or the call fails, we fall back to the pure
 * deterministic composer so campaign generation never hard-fails.
 */

import { resolveCampaignLanguage } from "@/config/campaign-languages.config";
import { resolveBrandTone } from "@/config/brand-tones.config";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORM_VOICE, SHARED_VOICE } from "@/config/social-prompts.config";
import { clamp, composeCaption, summarize, type CaptionSource } from "@/domain/captions";
import type { BrandContext, Platform } from "@/domain/entities";
import type { CaptionWriter } from "@/domain/ports";

const MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 15_000;

export function buildSystemPrompt(platform: Platform, brand?: BrandContext): string {
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;
  const brandName = brand?.name?.trim() || SHARED_VOICE.brandName;
  const tone = resolveBrandTone(brand?.tone);
  const language = resolveCampaignLanguage(brand?.language);
  const legacyTone = !tone ? brand?.tone?.trim() : null;
  const langFragments =
    language.id === "en"
      ? {
          hooks: SHARED_VOICE.hooks,
          valueProps: SHARED_VOICE.valueProps,
          signOff: SHARED_VOICE.signOff,
        }
      : {
          hooks: language.hooks,
          valueProps: language.valueProps,
          signOff: language.signOff,
        };

  return [
    `You are the social copywriter for ${brandName}.`,
    `You write a single ${spec.label} caption promoting a published blog post.`,
    `Write the entire caption in ${language.promptName}. Do not mix languages.`,
    "",
    "Brand voice fragments (use them as raw material, do not list them verbatim):",
    `- hooks: ${langFragments.hooks.map((h) => h.replaceAll("{brand}", brandName)).join(" | ")}`,
    `- value props: ${langFragments.valueProps.join(" | ")}`,
    `- sign-off: ${langFragments.signOff.replaceAll("{brand}", brandName)}`,
    `- base hashtags: ${SHARED_VOICE.baseHashtags.join(", ")}`,
    "",
    `${spec.label} rules:`,
    `- tone: ${voice.tone}`,
    `- structure to follow: ${JSON.stringify(voice.template)}`,
    `- calls to action to choose from: ${voice.ctas.join(" | ")}`,
    `- platform hashtags to draw from: ${voice.hashtags.join(", ")}`,
    `- at most ${spec.maxHashtags} hashtags total`,
    `- aim for ~${voice.targetLength} characters, hard limit ${Math.min(spec.maxCaptionLength, voice.targetLength)}`,
    `- summary length: about ${voice.summarySentences} sentence(s)`,
    `- emoji: ${voice.emoji ? "a little, tasteful" : "none"}`,
    `- line breaks: ${voice.lineBreaks ? "use them for scannability" : "single paragraph, no line breaks"}`,
    "",
    ...(tone
      ? [
          "",
          `Required brand tone: ${tone.label}.`,
          tone.description,
          "The tone must be obvious in word choice, rhythm, and energy — not just mentioned once.",
          ...(tone.hooks.length
            ? [`Tone-appropriate hooks to draw from: ${tone.hooks.map((h) => h.replaceAll("{brand}", brandName)).join(" | ")}`]
            : []),
        ]
      : legacyTone
        ? ["", `Brand tone requested by ${brandName}: ${legacyTone}. Let it shape the wording.`]
        : []),
    "",
    "Return ONLY the caption text. No markdown fences, no commentary, no quotes.",
  ].join("\n");
}

export function buildUserPrompt(post: CaptionSource, platform: Platform): string {
  const voice = PLATFORM_VOICE[platform]!;
  return [
    `Title: ${post.title}`,
    post.url ? `URL: ${post.url}` : "URL: (none — do not invent one)",
    "",
    "Post excerpt:",
    summarize(post.body, Math.max(voice.summarySentences + 3, 5)) || post.body.slice(0, 1200),
  ].join("\n");
}

function sanitize(raw: string, platform: Platform): string {
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;
  let text = raw
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/, "")
    .replace(/^["'](.*)["']$/s, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!voice.lineBreaks) text = text.replace(/\s*\n+\s*/g, " ");
  return clamp(text, Math.min(spec.maxCaptionLength, voice.targetLength));
}

/** Deterministic composer — the guaranteed floor. Never throws, never empty. */
function fallbackCaption(
  post: CaptionSource,
  platform: Platform,
  reason: string,
  brand?: BrandContext,
): string {
  console.warn(`[captions] falling back to deterministic composer (${platform}): ${reason}`);
  try {
    const text = composeCaption(post, platform, brand).trim();
    if (text) return text;
  } catch (error) {
    console.error("[captions] deterministic composer failed", error);
  }
  // Last resort: still platform-shaped, still valid.
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;
  const base = [post.title, summarize(post.body, voice.summarySentences), post.url ?? ""]
    .filter(Boolean)
    .join(voice.lineBreaks ? "\n\n" : " ");
  return clamp(base || post.title || SHARED_VOICE.brandName, Math.min(spec.maxCaptionLength, voice.targetLength));
}

export const openAiCaptionWriter: CaptionWriter = {
  name: "openai",
  async write(post, platform, brand) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return fallbackCaption(post, platform, "missing OPENAI_API_KEY", brand);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.8,
          max_tokens: 600,
          messages: [
            { role: "system", content: buildSystemPrompt(platform, brand) },
            { role: "user", content: buildUserPrompt(post, platform) },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        const label =
          response.status === 429
            ? "rate limited"
            : response.status === 401 || response.status === 403
              ? "auth rejected"
              : `HTTP ${response.status}`;
        return fallbackCaption(post, platform, `${label}: ${detail.slice(0, 200)}`, brand);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return fallbackCaption(post, platform, "empty completion", brand);

      const caption = sanitize(content, platform).trim();
      if (!caption) return fallbackCaption(post, platform, "caption empty after sanitize", brand);
      return caption;
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? `timeout after ${TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : "unknown error";
      return fallbackCaption(post, platform, reason, brand);
    } finally {
      clearTimeout(timer);
    }
  },
};

