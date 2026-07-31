/**
 * Supabase Storage adapter for rendered PNG variants (private bucket,
 * owner-scoped RLS; the UI reads through short-lived signed URLs).
 */

import type { ImageStore, RenderedImage } from "@/domain/ports";
import type { Db } from "../persistence/supabase-repositories.server";

export const IMAGE_BUCKET = "campaign-images";

export function createImageStore(db: Db): ImageStore {
  return {
    async put(path, image: RenderedImage) {
      const { error } = await db.storage.from(IMAGE_BUCKET).upload(path, image.bytes, {
        contentType: image.contentType,
        upsert: true,
      });
      if (error) throw new Error(`uploadImage: ${error.message}`);
      return path;
    },
    async signedUrl(path, expiresInSec = 3600) {
      const { data, error } = await db.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(path, expiresInSec);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  };
}

export function imagePath(userId: string, campaignId: string, platform: string): string {
  return `${userId}/${campaignId}/${platform}.png`;
}
