/**
 * Use cases: campaign creation and asset generation (captions + image variants).
 * One campaign fans out into exactly one SocialPostEntry per platform.
 */

import { PLATFORM_SPECS } from "@/config/platform-specs";
import {
  PLATFORMS,
  buildIdempotencyKey,
  deriveCampaignStatus,
  type Campaign,
  type CampaignSnapshot,
  type Platform,
  type SocialPostEntry,
} from "@/domain/entities";
import { computeVariantGeometry, defaultSourceImage, fitSubjectToSafeZone } from "@/domain/image-composition";
import type { AppContext } from "@/domain/ports";
import { imagePath } from "@/infrastructure/storage/image-store.server";

export async function createCampaign(
  context: AppContext,
  input: { postId: string; name?: string },
): Promise<CampaignSnapshot> {
  const post = await context.posts.findById(input.postId);
  if (!post) throw new Error("Blog post not found");

  const campaign = await context.campaigns.create({
    postId: post.id,
    name: (input.name?.trim() || post.title).slice(0, 200),
  });

  const entries = await generateCaptions(context, campaign.id);
  return { campaign, post, entries };
}

/** Regenerates every platform caption for a campaign (idempotent upsert). */
export async function generateCaptions(
  context: AppContext,
  campaignId: string,
): Promise<SocialPostEntry[]> {
  const campaign = await requireCampaign(context, campaignId);
  const post = await context.posts.findById(campaign.postId);
  if (!post) throw new Error("Blog post not found");

  const captions = await Promise.all(
    PLATFORMS.map(async (platform) => ({
      platform,
      caption: await context.captionWriter.write(
        { id: post.id, title: post.title, body: post.body, url: post.url },
        platform,
      ),
      idempotencyKey: buildIdempotencyKey(campaign.id, platform),
    })),
  );

  return context.entries.upsertForCampaign(campaign.id, captions);
}


/** Renders + stores one real PNG per platform, sized to the platform spec. */
export async function generateImages(
  context: AppContext,
  campaignId: string,
): Promise<SocialPostEntry[]> {
  const campaign = await requireCampaign(context, campaignId);
  const post = await context.posts.findById(campaign.postId);
  if (!post) throw new Error("Blog post not found");

  const entries = await context.entries.listByCampaign(campaign.id);
  const updated: SocialPostEntry[] = [];

  for (const entry of entries) {
    const spec = PLATFORM_SPECS[entry.platform as Platform]!;
    const geometry = computeVariantGeometry(defaultSourceImage(), entry.platform);
    const subject = fitSubjectToSafeZone(geometry);

    const image = await context.renderer.render({
      platform: entry.platform,
      width: spec.width,
      height: spec.height,
      title: post.title,
      seed: `${post.id}:${entry.platform}`,
      brand: "FlyRank",
      subject,
    });

    const path = imagePath(context.userId, campaign.id, entry.platform);
    await context.images.put(path, image);
    updated.push(
      await context.entries.update(entry.id, {
        imagePath: path,
        imageWidth: image.width,
        imageHeight: image.height,
      }),
    );
  }

  return updated;
}

export async function getCampaignSnapshot(
  context: AppContext,
  campaignId: string,
): Promise<CampaignSnapshot> {
  const campaign = await requireCampaign(context, campaignId);
  const post = await context.posts.findById(campaign.postId);
  if (!post) throw new Error("Blog post not found");
  const entries = await context.entries.listByCampaign(campaign.id);
  return { campaign, post, entries };
}

export async function syncCampaignStatus(
  context: AppContext,
  campaignId: string,
): Promise<Campaign> {
  const entries = await context.entries.listByCampaign(campaignId);
  return context.campaigns.update(campaignId, { status: deriveCampaignStatus(entries) });
}

export async function requireCampaign(context: AppContext, campaignId: string): Promise<Campaign> {
  const campaign = await context.campaigns.findById(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  return campaign;
}
