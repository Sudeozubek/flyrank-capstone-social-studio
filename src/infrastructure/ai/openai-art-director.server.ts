/**
 * Art director — turns blog content into a concrete image-generation brief.
 * Uses gpt-4o-mini; falls back to a deterministic prompt if the API is unavailable.
 */

import { resolveCampaignLanguage } from "@/config/campaign-languages.config";
import { resolveBrandTone } from "@/config/brand-tones.config";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { summarize } from "@/domain/captions";
import type { Platform } from "@/domain/entities";

const MODEL = "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 12_000;

export interface ArtDirectionInput {
  title: string;
  body: string;
  platform: Platform;
  brand: string;
  brandTone?: string | null;
  language?: string | null;
}

export function buildFallbackImagePrompt(input: ArtDirectionInput): string {
  const spec = PLATFORM_SPECS[input.platform]!;
  const tone = resolveBrandTone(input.brandTone);
  const language = resolveCampaignLanguage(input.language);
  const excerpt = summarize(input.body, 2) || input.body.slice(0, 280);
  const toneLine = tone ? `${tone.label.toLowerCase()} tone` : "professional, modern";

  return [
    `Professional ${spec.label} social media post graphic, ${spec.aspectLabel} aspect ratio.`,
    `Visual concept should resonate with a ${language.promptName}-speaking audience.`,
    `Topic: "${input.title}".`,
    `Visual concept inspired by: ${excerpt}`,
    `${toneLine} marketing design for ${input.brand}.`,
    "Clean editorial layout, strong focal point, cohesive color palette, soft studio lighting.",
    "Photorealistic or polished digital illustration — no clip art, no stock-watermark look.",
    "Leave negative space for social UI; do not render long paragraphs of text in the image.",
    "No logos, no URLs, no hashtags, no platform chrome.",
  ].join(" ");
}

export async function craftImagePrompt(input: ArtDirectionInput): Promise<string> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return buildFallbackImagePrompt(input);

  const spec = PLATFORM_SPECS[input.platform]!;
  const tone = resolveBrandTone(input.brandTone);
  const language = resolveCampaignLanguage(input.language);
  const excerpt = summarize(input.body, 4) || input.body.slice(0, 900);

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
        temperature: 0.7,
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content: [
              "You are a senior art director for social media marketing.",
              "Write ONE image-generation prompt for a professional platform post graphic.",
              "The visual must clearly relate to the article topic — use metaphors, objects, scenes, or environments that match the content.",
              "Match the brand tone when provided.",
              "Requirements: polished, scroll-stopping, commercially usable, no watermarks, no fake UI chrome.",
              "Avoid readable text blocks in the image (short labels only if essential).",
              "Return only the prompt paragraph — no markdown, no quotes, no commentary.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              `Platform: ${spec.label} (${spec.aspectLabel})`,
              `Output language context: ${language.promptName}`,
              `Brand: ${input.brand}`,
              tone ? `Brand tone: ${tone.label} — ${tone.description}` : "Brand tone: professional",
              `Article title: ${input.title}`,
              `Article excerpt: ${excerpt}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[images] art director HTTP ${response.status}: ${detail.slice(0, 160)}`);
      return buildFallbackImagePrompt(input);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return buildFallbackImagePrompt(input);

    return content
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```$/, "")
      .replace(/^["'](.*)["']$/s, "$1")
      .trim();
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timeout after ${TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "unknown error";
    console.warn(`[images] art director failed (${reason})`);
    return buildFallbackImagePrompt(input);
  } finally {
    clearTimeout(timer);
  }
}
