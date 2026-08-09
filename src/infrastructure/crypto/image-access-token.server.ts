/**
 * Stable, cacheable campaign image URLs (HMAC — not rotating Supabase signed URLs).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type CampaignImageSize = "thumb" | "full";

function imageAccessSecret(): string {
  return (
    process.env["WEBHOOK_SIGNING_SECRET"] ??
    process.env["TOKEN_ENCRYPTION_KEY"] ??
    "flyrank-dev-webhook-secret"
  );
}

function sign(campaignId: string, platform: string, size: CampaignImageSize): string {
  return createHmac("sha256", imageAccessSecret())
    .update(`${campaignId}:${platform}:${size}`)
    .digest("hex")
    .slice(0, 32);
}

export function buildCampaignImageUrl(
  campaignId: string,
  platform: string,
  options?: { size?: CampaignImageSize },
): string {
  const size = options?.size ?? "full";
  const params = new URLSearchParams({ sig: sign(campaignId, platform, size) });
  if (size !== "full") params.set("size", size);
  return `/api/public/campaign-images/${campaignId}/${platform}?${params}`;
}

export function verifyCampaignImageSig(
  campaignId: string,
  platform: string,
  size: CampaignImageSize,
  sig: string,
): boolean {
  const expected = sign(campaignId, platform, size);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
