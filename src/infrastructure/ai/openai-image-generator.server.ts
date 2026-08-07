/**
 * OpenAI image generation adapter (gpt-image-1.5 by default).
 */

import type { Platform } from "@/domain/entities";
import type { AiCostMeter } from "@/domain/ports";
import {
  getTestAiCostMeter,
  imageGenerationEstimateUsd,
} from "@/infrastructure/ai/ai-cost-meter.server";

const ENDPOINT = "https://api.openai.com/v1/images/generations";
const TIMEOUT_MS = 60_000;
const DEFAULT_MODEL = "gpt-image-1.5";
const DEFAULT_QUALITY = "medium";

function generationSize(platform: Platform): "1024x1024" | "1536x1024" | "1024x1536" {
  if (platform === "x" || platform === "linkedin") return "1536x1024";
  return "1024x1024";
}

export async function generateOpenAiImage(
  prompt: string,
  platform: Platform,
  meter: AiCostMeter = getTestAiCostMeter(),
): Promise<Uint8Array> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("missing OPENAI_API_KEY");

  const imageEstimate = imageGenerationEstimateUsd();
  if (!(await meter.canSpend(imageEstimate))) {
    throw new Error("AI budget exhausted");
  }

  const model = process.env["OPENAI_IMAGE_MODEL"]?.trim() || DEFAULT_MODEL;
  const quality = process.env["OPENAI_IMAGE_QUALITY"]?.trim() || DEFAULT_QUALITY;

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
        model,
        prompt,
        size: generationSize(platform),
        quality,
        n: 1,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`image API HTTP ${response.status}: ${detail.slice(0, 240)}`);
    }

    await meter.record({
      feature: `image:${platform}`,
      model,
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: imageEstimate,
    });

    const json = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const item = json.data?.[0];
    if (!item) throw new Error("image API returned no data");

    if (item.b64_json) {
      return Uint8Array.from(Buffer.from(item.b64_json, "base64"));
    }

    if (item.url) {
      const imageResponse = await fetch(item.url, { signal: controller.signal });
      if (!imageResponse.ok) throw new Error(`image download HTTP ${imageResponse.status}`);
      return new Uint8Array(await imageResponse.arrayBuffer());
    }

    throw new Error("image API response missing b64_json and url");
  } finally {
    clearTimeout(timer);
  }
}
