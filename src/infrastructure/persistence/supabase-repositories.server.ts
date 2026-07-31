/**
 * Repository Pattern — the only module that knows the database exists.
 * Each repository is constructed with an already-scoped Supabase client;
 * RLS enforces tenant isolation, and every write stamps the owning user.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  BlogPost,
  Campaign,
  Platform,
  PlatformCredential,
  PublishAttempt,
  SocialPostEntry,
  WebhookEvent,
} from "@/domain/entities";
import type {
  AttemptRepository,
  CampaignRepository,
  CredentialRepository,
  EntryPatch,
  EntryRepository,
  PostRepository,
  WebhookEventRepository,
} from "@/domain/ports";

export type Db = SupabaseClient<Database>;

type PostRow = Database["public"]["Tables"]["blog_posts"]["Row"];
type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type EntryRow = Database["public"]["Tables"]["social_post_entries"]["Row"];
type CredentialRow = Database["public"]["Tables"]["platform_credentials"]["Row"];
type AttemptRow = Database["public"]["Tables"]["publish_attempts"]["Row"];
type WebhookRow = Database["public"]["Tables"]["webhook_events"]["Row"];

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown database error"}`);
}

export const toPost = (row: PostRow): BlogPost => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  body: row.body,
  url: row.url,
  source: row.source,
  createdAt: row.created_at,
});

export const toCampaign = (row: CampaignRow): Campaign => ({
  id: row.id,
  userId: row.user_id,
  postId: row.post_id,
  name: row.name,
  status: row.status,
  scheduledFor: row.scheduled_for,
  brandName: row.brand_name ?? null,
  brandTone: row.brand_tone ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toEntry = (row: EntryRow): SocialPostEntry => ({
  id: row.id,
  userId: row.user_id,
  campaignId: row.campaign_id,
  platform: row.platform,
  caption: row.caption,
  imagePath: row.image_path,
  imageWidth: row.image_width,
  imageHeight: row.image_height,
  status: row.status,
  scheduledFor: row.scheduled_for,
  idempotencyKey: row.idempotency_key,
  attempts: row.attempts,
  leaseUntil: row.lease_until,
  nextAttemptAt: row.next_attempt_at,
  remoteId: row.remote_id,
  error: row.error,
  publishedAt: row.published_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const entryPatchToRow = (patch: EntryPatch) => ({
  ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
  ...(patch.imagePath !== undefined ? { image_path: patch.imagePath } : {}),
  ...(patch.imageWidth !== undefined ? { image_width: patch.imageWidth } : {}),
  ...(patch.imageHeight !== undefined ? { image_height: patch.imageHeight } : {}),
  ...(patch.status !== undefined ? { status: patch.status } : {}),
  ...(patch.scheduledFor !== undefined ? { scheduled_for: patch.scheduledFor } : {}),
  ...(patch.attempts !== undefined ? { attempts: patch.attempts } : {}),
  ...(patch.leaseUntil !== undefined ? { lease_until: patch.leaseUntil } : {}),
  ...(patch.nextAttemptAt !== undefined ? { next_attempt_at: patch.nextAttemptAt } : {}),
  ...(patch.remoteId !== undefined ? { remote_id: patch.remoteId } : {}),
  ...(patch.error !== undefined ? { error: patch.error } : {}),
  ...(patch.publishedAt !== undefined ? { published_at: patch.publishedAt } : {}),
});

export function createPostRepository(db: Db, userId: string): PostRepository {
  return {
    async create(input) {
      const { data, error } = await db
        .from("blog_posts")
        .insert({
          user_id: userId,
          title: input.title,
          body: input.body,
          url: input.url,
          source: input.source,
        })
        .select()
        .single();
      if (error || !data) fail("createPost", error);
      return toPost(data);
    },
    async list() {
      const { data, error } = await db
        .from("blog_posts")
        .select()
        .order("created_at", { ascending: false });
      if (error) fail("listPosts", error);
      return (data ?? []).map(toPost);
    },
    async findById(id) {
      const { data, error } = await db.from("blog_posts").select().eq("id", id).maybeSingle();
      if (error) fail("findPost", error);
      return data ? toPost(data) : null;
    },
    async delete(id) {
      const { error } = await db.from("blog_posts").delete().eq("id", id);
      if (error) fail("deletePost", error);
    },
  };
}

export function createCampaignRepository(db: Db, userId: string): CampaignRepository {
  return {
    async create(input) {
      const { data, error } = await db
        .from("campaigns")
        .insert({
          user_id: userId,
          post_id: input.postId,
          name: input.name,
          brand_name: input.brandName ?? null,
          brand_tone: input.brandTone ?? null,
        })
        .select()
        .single();
      if (error || !data) fail("createCampaign", error);
      return toCampaign(data);
    },
    async list() {
      const { data, error } = await db
        .from("campaigns")
        .select()
        .order("created_at", { ascending: false });
      if (error) fail("listCampaigns", error);
      return (data ?? []).map(toCampaign);
    },
    async findById(id) {
      const { data, error } = await db.from("campaigns").select().eq("id", id).maybeSingle();
      if (error) fail("findCampaign", error);
      return data ? toCampaign(data) : null;
    },
    async update(id, patch) {
      const { data, error } = await db
        .from("campaigns")
        .update({
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.scheduledFor !== undefined ? { scheduled_for: patch.scheduledFor } : {}),
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.brandName !== undefined ? { brand_name: patch.brandName } : {}),
          ...(patch.brandTone !== undefined ? { brand_tone: patch.brandTone } : {}),
        })
        .eq("id", id)
        .select()
        .single();
      if (error || !data) fail("updateCampaign", error);
      return toCampaign(data);
    },
    async delete(id) {
      const { error } = await db.from("campaigns").delete().eq("id", id);
      if (error) fail("deleteCampaign", error);
    },
  };
}

export function createEntryRepository(db: Db, userId: string): EntryRepository {
  return {
    async upsertForCampaign(campaignId, entries) {
      const { data, error } = await db
        .from("social_post_entries")
        .upsert(
          entries.map((e) => ({
            user_id: userId,
            campaign_id: campaignId,
            platform: e.platform,
            caption: e.caption,
            idempotency_key: e.idempotencyKey,
          })),
          { onConflict: "campaign_id,platform" },
        )
        .select();
      if (error) fail("upsertEntries", error);
      return (data ?? []).map(toEntry);
    },
    async listByCampaign(campaignId) {
      const { data, error } = await db
        .from("social_post_entries")
        .select()
        .eq("campaign_id", campaignId)
        .order("platform");
      if (error) fail("listEntries", error);
      return (data ?? []).map(toEntry);
    },
    async findById(id) {
      const { data, error } = await db
        .from("social_post_entries")
        .select()
        .eq("id", id)
        .maybeSingle();
      if (error) fail("findEntry", error);
      return data ? toEntry(data) : null;
    },
    async update(id, patch) {
      const { data, error } = await db
        .from("social_post_entries")
        .update(entryPatchToRow(patch))
        .eq("id", id)
        .select()
        .single();
      if (error || !data) fail("updateEntry", error);
      return toEntry(data);
    },
  };
}

export function createCredentialRepository(db: Db, userId: string): CredentialRepository {
  return {
    async find(platform: Platform) {
      const { data, error } = await db
        .from("platform_credentials")
        .select()
        .eq("platform", platform)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) fail("findCredential", error);
      if (!data) return null;
      const row = data as CredentialRow;
      return {
        userId: row.user_id,
        platform: row.platform,
        accessTokenCiphertext: row.access_token_ciphertext,
        expiresAt: row.expires_at,
      } satisfies PlatformCredential;
    },
    async save(credential) {
      const { error } = await db.from("platform_credentials").upsert(
        {
          user_id: userId,
          platform: credential.platform,
          access_token_ciphertext: credential.accessTokenCiphertext,
          expires_at: credential.expiresAt,
        },
        { onConflict: "user_id,platform" },
      );
      if (error) fail("saveCredential", error);
    },
  };
}

export function createAttemptRepository(db: Db, userId: string): AttemptRepository {
  return {
    async record(input) {
      const { error } = await db.from("publish_attempts").insert({
        user_id: userId,
        entry_id: input.entryId,
        attempt_no: input.attemptNo,
        http_status: input.httpStatus ?? null,
        retry_after_sec: input.retryAfterSec ?? null,
        outcome: input.outcome,
        detail: input.detail ?? null,
      });
      if (error) fail("recordAttempt", error);
    },
    async listByEntry(entryId) {
      const { data, error } = await db
        .from("publish_attempts")
        .select()
        .eq("entry_id", entryId)
        .order("created_at", { ascending: false });
      if (error) fail("listAttempts", error);
      return (data ?? []).map(
        (row: AttemptRow): PublishAttempt => ({
          id: row.id,
          entryId: row.entry_id,
          attemptNo: row.attempt_no,
          httpStatus: row.http_status,
          retryAfterSec: row.retry_after_sec,
          outcome: row.outcome,
          detail: row.detail,
          createdAt: row.created_at,
        }),
      );
    },
  };
}

export function createWebhookEventRepository(db: Db, userId: string | null): WebhookEventRepository {
  return {
    async record(input) {
      const { error } = await db.from("webhook_events").insert({
        user_id: input.userId ?? userId,
        entry_id: input.entryId ?? null,
        platform: input.platform ?? null,
        signature_valid: input.signatureValid,
        http_status: input.httpStatus,
        payload_digest: input.payloadDigest,
        message: input.message ?? null,
      });
      if (error) fail("recordWebhookEvent", error);
    },
    async listRecent(limit = 50) {
      const { data, error } = await db
        .from("webhook_events")
        .select()
        .order("received_at", { ascending: false })
        .limit(limit);
      if (error) fail("listWebhookEvents", error);
      return (data ?? []).map(
        (row: WebhookRow): WebhookEvent => ({
          id: row.id,
          entryId: row.entry_id,
          platform: row.platform,
          signatureValid: row.signature_valid,
          httpStatus: row.http_status,
          payloadDigest: row.payload_digest,
          message: row.message,
          receivedAt: row.received_at,
        }),
      );
    },
  };
}
