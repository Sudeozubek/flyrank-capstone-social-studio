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
import {
  clamp,
  composeCaption,
  captionLimit,
  fitCaptionToLimit,
  summarize,
  type CaptionSource,
} from "@/domain/captions";
import type { BrandContext, Platform } from "@/domain/entities";
import type { AiCostMeter, CaptionWriter } from "@/domain/ports";
import {
  CHAT_PREFLIGHT_USD,
  estimateChatCost,
  getTestAiCostMeter,
} from "@/infrastructure/ai/ai-cost-meter.server";

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

  const hooks = tone?.hooks ?? (language.id === "en" ? SHARED_VOICE.hooks : language.hooks);
  const valueProps =
    tone?.valueProps ?? (language.id === "en" ? SHARED_VOICE.valueProps : language.valueProps);
  const signOff = tone?.signOff ?? (language.id === "en" ? SHARED_VOICE.signOff : language.signOff);
  const ctas = tone?.ctas[platform] ?? language.ctas[platform] ?? voice.ctas;

  return [
    `You are the social copywriter for ${brandName}.`,
    `You write a single ${spec.label} caption promoting a published blog post.`,
    `Write the entire caption in ${language.promptName}. Do not mix languages.`,
    "",
    "Content-first rules (critical):",
    "- Lead with a specific insight, problem, or takeaway from the article — not a generic announcement.",
    '- Never open with clichés like "we published a new post", "worth reading", "yayınladık", or "okumaya değer".',
    "- Reference concrete ideas, outcomes, or lessons from the excerpt — the reader should know what the article is about.",
    "- Vary structure across platforms; do not reuse the same opener pattern every time.",
    "- Use the hook fragments below only as tonal inspiration — do not copy them verbatim.",
    "",
    "Voice fragments (inspiration only — adapt to the article):",
    `- hooks: ${hooks.map((h) => h.replaceAll("{brand}", brandName)).join(" | ")}`,
    `- value angles: ${valueProps.join(" | ")}`,
    `- sign-off: ${signOff.replaceAll("{brand}", brandName)}`,
    `- base hashtags: ${SHARED_VOICE.baseHashtags.join(", ")}`,
    "",
    `${spec.label} rules:`,
    `- tone: ${voice.tone}`,
    `- structure to follow: ${JSON.stringify(voice.template)}`,
    `- calls to action to choose from: ${ctas.join(" | ")}`,
    `- platform hashtags to draw from: ${voice.hashtags.join(", ")}`,
    `- at most ${spec.maxHashtags} hashtags total`,
    `- aim for ~${voice.targetLength} characters, hard limit ${captionLimit(platform)}`,
    `- summary length: about ${voice.summarySentences} sentence(s)`,
    `- emoji: ${voice.emoji ? "a little, tasteful — not on every line" : "none"}`,
    `- line breaks: ${voice.lineBreaks ? "use them for scannability" : "single paragraph, no line breaks"}`,
    ...(platform === "x"
      ? [
          "- X format: 3–4 short lines (hook, insight, takeaway) separated by line breaks — use most of the character budget.",
          '- Never use "…" or an ellipsis. If tight on space, shorten — do not trail off.',
          "- Aim for ~260–280 characters when the article has enough substance.",
        ]
      : platform === "linkedin"
        ? [
            "- LinkedIn format: professional opener, 2–3 short paragraphs, one clear takeaway, link on its own line.",
            "- No consumer-social slang; write for practitioners and decision-makers.",
            "- Hashtags sparingly — only when they add discoverability.",
          ]
        : []),
    "",
    ...(tone
      ? [
          "",
          `Required brand tone: ${tone.label}.`,
          tone.description,
          "The tone must shape word choice, rhythm, and energy throughout — opener, body, and CTA.",
          `Tone-appropriate CTAs: ${tone.ctas[platform].join(" | ")}`,
          ...(tone.hooks.length
            ? [
                `Tone-appropriate angles: ${tone.hooks.map((h) => h.replaceAll("{brand}", brandName)).join(" | ")}`,
              ]
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
  const excerpt =
    summarize(post.body, Math.max(voice.summarySentences + 5, 8)) || post.body.slice(0, 2000);
  return [
    `Title: ${post.title}`,
    post.url ? `URL: ${post.url}` : "URL: (none — do not invent one)",
    "",
    "Article excerpt (base the caption on these specifics):",
    excerpt,
    "",
    "Write a caption that would only make sense for this article — not a generic blog promo.",
  ].join("\n");
}

function sanitize(raw: string, platform: Platform): string {
  const voice = PLATFORM_VOICE[platform]!;
  let text = raw
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/, "")
    .replace(/^["'](.*)["']$/s, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!voice.lineBreaks) text = text.replace(/\s*\n+\s*/g, " ");
  else text = text.replace(/[ \t]+\n/g, "\n").trim();
  text = text.replace(/…+$/u, "").trim();
  return fitCaptionToLimit(text, captionLimit(platform), {
    allowEllipsis: platform !== "x",
    preserveLineBreaks: voice.lineBreaks,
  });
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
  const voice = PLATFORM_VOICE[platform]!;
  const base = [post.title, summarize(post.body, voice.summarySentences), post.url ?? ""]
    .filter(Boolean)
    .join(voice.lineBreaks ? "\n\n" : " ");
  return fitCaptionToLimit(base || post.title || SHARED_VOICE.brandName, captionLimit(platform), {
    allowEllipsis: platform !== "x",
  });
}

export function createOpenAiCaptionWriter(meter: AiCostMeter): CaptionWriter {
  return {
    name: "openai",
    async write(post, platform, brand) {
      const apiKey = process.env["OPENAI_API_KEY"];
      if (!apiKey) return fallbackCaption(post, platform, "missing OPENAI_API_KEY", brand);
      if (!(await meter.canSpend(CHAT_PREFLIGHT_USD))) {
        return fallbackCaption(post, platform, "AI budget exhausted", brand);
      }

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
            temperature: 0.72,
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
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const usage = json.usage;
        if (usage) {
          await meter.record({
            feature: `caption:${platform}`,
            model: MODEL,
            inputTokens: usage.prompt_tokens ?? 0,
            outputTokens: usage.completion_tokens ?? 0,
            estimatedUsd: estimateChatCost(
              MODEL,
              usage.prompt_tokens ?? 0,
              usage.completion_tokens ?? 0,
            ),
          });
        }
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
}

/** Default export for tests — uses the in-memory meter. */
export const openAiCaptionWriter = createOpenAiCaptionWriter(getTestAiCostMeter());
