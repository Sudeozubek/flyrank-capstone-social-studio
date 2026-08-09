/**
 * Cacheable campaign image proxy — stable URL + browser cache, no rotating signed URLs.
 */

import { createFileRoute } from "@tanstack/react-router";
import { isPlatform } from "@/domain/entities";
import {
  type CampaignImageSize,
  verifyCampaignImageSig,
} from "@/infrastructure/crypto/image-access-token.server";
import { resizePngCover } from "@/infrastructure/imaging/image-resize.server";
import { IMAGE_BUCKET } from "@/infrastructure/storage/image-store.server";

const CACHE = "public, max-age=604800, immutable";
const THUMB_CACHE_MAX = 128;
const thumbCache = new Map<string, Uint8Array>();

function parseSize(value: string | null): CampaignImageSize {
  return value === "thumb" ? "thumb" : "full";
}

export const Route = createFileRoute("/api/public/campaign-images/$campaignId/$platform")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const campaignId = params.campaignId;
        const platform = params.platform;
        if (!isPlatform(platform)) {
          return new Response("Invalid platform", { status: 400 });
        }

        const url = new URL(request.url);
        const sig = url.searchParams.get("sig") ?? "";
        const size = parseSize(url.searchParams.get("size"));

        if (!verifyCampaignImageSig(campaignId, platform, size, sig)) {
          return new Response("Forbidden", { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: entry, error: entryError } = await supabaseAdmin
          .from("social_post_entries")
          .select("image_path")
          .eq("campaign_id", campaignId)
          .eq("platform", platform)
          .maybeSingle();

        if (entryError || !entry?.image_path) {
          return new Response("Not found", { status: 404 });
        }

        const { data: file, error: downloadError } = await supabaseAdmin.storage
          .from(IMAGE_BUCKET)
          .download(entry.image_path);

        if (downloadError || !file) {
          return new Response("Not found", { status: 404 });
        }

        let bytes = new Uint8Array(await file.arrayBuffer());
        if (size === "thumb") {
          const cached = thumbCache.get(entry.image_path);
          if (cached) {
            bytes = cached;
          } else {
            bytes = await resizePngCover(bytes, 640, 640);
            if (thumbCache.size >= THUMB_CACHE_MAX) {
              const first = thumbCache.keys().next().value;
              if (first) thumbCache.delete(first);
            }
            thumbCache.set(entry.image_path, bytes);
          }
        }

        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": CACHE,
          },
        });
      },
    },
  },
});
