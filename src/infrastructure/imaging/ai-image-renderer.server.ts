/**
 * AI image renderer — GPT art direction + OpenAI image generation, with SVG fallback.
 */

import { craftImagePrompt } from "@/infrastructure/ai/openai-art-director.server";
import { generateOpenAiImage } from "@/infrastructure/ai/openai-image-generator.server";
import { resizePngCover } from "@/infrastructure/imaging/image-resize.server";
import type { ImageRenderer } from "@/domain/ports";

export function createAiImageRenderer(fallback: ImageRenderer): ImageRenderer {
  return {
    name: "openai",
    async render(spec) {
      if (!process.env["OPENAI_API_KEY"]?.trim()) {
        return fallback.render(spec);
      }

      try {
        const prompt = await craftImagePrompt({
          title: spec.title,
          body: spec.body ?? spec.title,
          platform: spec.platform,
          brand: spec.brand,
          brandTone: spec.brandTone ?? null,
        });

        const raw = await generateOpenAiImage(prompt, spec.platform);
        const bytes = await resizePngCover(raw, spec.width, spec.height);

        return {
          bytes,
          width: spec.width,
          height: spec.height,
          contentType: "image/png",
          renderer: "openai",
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        console.warn(`[images] AI renderer failed, using SVG fallback: ${reason}`);
        return fallback.render(spec);
      }
    },
  };
}
