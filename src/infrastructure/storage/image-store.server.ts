/**
 * Supabase Storage adapter for rendered PNG variants (private bucket,
 * owner-scoped RLS; the UI reads through short-lived signed URLs).
 */

import type { ImageSignedUrlOptions, ImageStore, RenderedImage } from "@/domain/ports";
import { campaignImagePath } from "@/domain/storage-paths";
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
    async signedUrl(path, options: ImageSignedUrlOptions = {}) {
      const expiresInSec = options.expiresInSec ?? 3600;
      const transform = options.transform;

      if (transform) {
        const transformed = await db.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(path, expiresInSec, { transform });
        if (!transformed.error && transformed.data?.signedUrl) {
          return transformed.data.signedUrl;
        }
      }

      const { data, error } = await db.storage.from(IMAGE_BUCKET).createSignedUrl(path, expiresInSec);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  };
}

export const imagePath = campaignImagePath;
