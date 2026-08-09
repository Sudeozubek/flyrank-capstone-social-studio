/**
 * Wire views for MCP responses.
 *
 * Tool results are read by a model with a finite context window, so responses
 * carry what a caller can act on and drop what only the server needs: the
 * owning `userId` (every row is already scoped to the caller), the
 * `idempotencyKey` and the worker's `leaseUntil`. Post bodies are truncated —
 * the full text is the model's own input, not something to echo back.
 */

import type { BlogPost, Campaign, SocialPostEntry } from "@/domain/entities";

const POST_BODY_CHARS = 600;

export function campaignView(campaign: Campaign) {
  return {
    id: campaign.id,
    postId: campaign.postId,
    name: campaign.name,
    status: campaign.status,
    scheduledFor: campaign.scheduledFor,
    brandName: campaign.brandName,
    brandTone: campaign.brandTone,
    brandLanguage: campaign.brandLanguage,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export function postView(post: BlogPost) {
  return {
    id: post.id,
    title: post.title,
    url: post.url,
    source: post.source,
    createdAt: post.createdAt,
    bodyPreview:
      post.body.length > POST_BODY_CHARS ? `${post.body.slice(0, POST_BODY_CHARS)}…` : post.body,
    bodyLength: post.body.length,
  };
}

export function entryView(entry: SocialPostEntry) {
  return {
    id: entry.id,
    platform: entry.platform,
    status: entry.status,
    caption: entry.caption,
    imageWidth: entry.imageWidth,
    imageHeight: entry.imageHeight,
    hasImage: Boolean(entry.imagePath),
    attempts: entry.attempts,
    scheduledFor: entry.scheduledFor,
    nextAttemptAt: entry.nextAttemptAt,
    remoteId: entry.remoteId,
    publishedAt: entry.publishedAt,
    error: entry.error,
  };
}

export function snapshotView(snapshot: {
  campaign: Campaign;
  post: BlogPost;
  entries: SocialPostEntry[];
}) {
  return {
    campaign: campaignView(snapshot.campaign),
    post: postView(snapshot.post),
    entries: snapshot.entries.map(entryView),
  };
}
