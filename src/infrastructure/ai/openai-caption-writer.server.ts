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

import { PLATFORM_SPECS } from "@/config/platform-specs";
import { PLATFORM_VOICE, SHARED_VOICE } from "@/config/social-prompts.config";
import { clamp, composeCaption, summarize, type CaptionSource } from "@/domain/captions";
import type { Platform } from "@/domain/entities";
import type { CaptionWriter } from "@/domain/ports";

const MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export function buildSystemPrompt(platform: Platform): string {
  const spec = PLATFORM_SPECS[platform]!;
  const voice = PLATFORM_VOICE[platform]!;

  return [
    `You are the social copywriter for ${SHARED_VOICE.brandName}.`,
    `You write a single ${spec.label} caption promoting a published blog post.`,
    "",
    "Brand voice fragments (use them as raw material, do not list them verbatim):",
    `- hooks: ${SHARED_VOICE.hooks.join(" | ")}`,
    `- value props: ${SHARED_VOICE.valueProps.join(" | ")}`,
    `- sign-off: ${SHARED_VOICE.signOff}`,
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

export const openAiCaptionWriter: CaptionWriter = {
  name: "openai",
  async write(post, platform) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return composeCaption(post, platform);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.8,
          max_tokens: 600,
          messages: [
            { role: "system", content: buildSystemPrompt(platform) },
            { role: "user", content: buildUserPrompt(post, platform) },
          ],
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error(`[captions] OpenAI ${response.status}: ${detail.slice(0, 300)}`);
        return composeCaption(post, platform);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return composeCaption(post, platform);
      return sanitize(content, platform);
    } catch (error) {
      console.error("[captions] OpenAI call failed", error);
      return composeCaption(post, platform);
    }
  },
};
