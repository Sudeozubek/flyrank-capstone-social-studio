/**
 * Interface layer: typed RPC for the dashboard. Thin wrappers only — every
 * one of these delegates straight into an application use case.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createCampaign,
  deleteCampaign,
  editCampaign,
  generateCaptions,
  generateImages,
  getCampaignSnapshot,
} from "@/application/campaign-usecases";
import { ingestPastedPost, ingestUploadedPost } from "@/application/ingest-content";
import {
  publishCampaign,
  retryCampaign,
  scheduleCampaign,
} from "@/application/publish-usecases";
import { runWorkerTick } from "@/application/worker";
import { createAppContext } from "@/infrastructure/context.server";
import type { CampaignSnapshot } from "@/domain/entities";

const uuid = z.string().uuid();

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    return app.posts.list();
  });

export const createPostFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().max(200).optional(),
        body: z.string().min(40).max(200_000),
        url: z.string().url().max(500).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    return ingestPastedPost(app, { body: data.body, ...(data.title ? { title: data.title } : {}), url: data.url ?? null });
  });

export const createPostFromUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["markdown", "pdf", "docx"]),
        filename: z.string().min(1).max(255),
        base64: z.string().min(1),
        url: z.string().url().max(500).nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    const bytes = Uint8Array.from(Buffer.from(data.base64, "base64"));
    return ingestUploadedPost(app, {
      kind: data.kind,
      filename: data.filename,
      data: bytes,
      url: data.url ?? null,
    });
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    await app.posts.delete(data.postId);
    return { ok: true };
  });

/** Create campaign + captions + rendered image variants in one call. */
export const createCampaignWithAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ postId: uuid, name: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId, { requestUrl: getRequest().url });
    const snapshot = await createCampaign(app, {
      postId: data.postId,
      ...(data.name ? { name: data.name } : {}),
    });
    await generateImages(app, snapshot.campaign.id);
    return getCampaignSnapshot(app, snapshot.campaign.id);
  });

export const regenerateCaptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ campaignId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    await generateCaptions(app, data.campaignId);
    return getCampaignSnapshot(app, data.campaignId);
  });

export const regenerateImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ campaignId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    await generateImages(app, data.campaignId);
    return getCampaignSnapshot(app, data.campaignId);
  });

export const scheduleCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ campaignId: uuid, scheduledFor: z.string().min(4) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId);
    await scheduleCampaign(app, data);
    return getCampaignSnapshot(app, data.campaignId);
  });

export const publishCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ campaignId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId, { requestUrl: getRequest().url });
    await publishCampaign(app, data.campaignId);
    return getCampaignSnapshot(app, data.campaignId);
  });

export const retryCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ campaignId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId, { requestUrl: getRequest().url });
    await retryCampaign(app, data.campaignId);
    return getCampaignSnapshot(app, data.campaignId);
  });

export interface DashboardData {
  campaigns: Array<CampaignSnapshot & { images: Record<string, string | null> }>;
  posts: Awaited<ReturnType<typeof listPosts>>;
  webhooks: Awaited<ReturnType<ReturnType<typeof createAppContext>["webhooks"]["listRecent"]>>;
}

export const loadDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const app = createAppContext(context.supabase as never, context.userId);
    const [posts, campaigns, webhooks] = await Promise.all([
      app.posts.list(),
      app.campaigns.list(),
      app.webhooks.listRecent(25),
    ]);

    const snapshots = await Promise.all(
      campaigns.map(async (campaign) => {
        const [post, entries] = await Promise.all([
          app.posts.findById(campaign.postId),
          app.entries.listByCampaign(campaign.id),
        ]);
        const images: Record<string, string | null> = {};
        for (const entry of entries) {
          images[entry.platform] = entry.imagePath
            ? await app.images.signedUrl(entry.imagePath, 3600)
            : null;
        }
        return { campaign, post: post!, entries, images };
      }),
    );

    return { posts, campaigns: snapshots.filter((s) => s.post), webhooks };
  });

export const tickWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return runWorkerTick(context.supabase as never, context.userId, { requestUrl: getRequest().url });
  });

export const setPlatformRateLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ platform: z.enum(["instagram", "x"]), failures: z.number().int().min(0).max(10) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { setRateLimit } = await import("@/routes/api/public/fake-platform/$platform/posts");
    setRateLimit(data.platform, data.failures);
    return { ok: true, ...data };
  });

/** Published-blog library: catalogued sources fetched in the background. */
export const listBlogLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listLibrary } = await import("@/infrastructure/feeds/blog-library.server");
    return listLibrary(8);
  });

/** Import a published post from the library and campaign on it in one call. */
export const createCampaignFromLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ url: z.string().url().max(500), name: z.string().max(200).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const app = createAppContext(context.supabase as never, context.userId, {
      requestUrl: getRequest().url,
    });
    const { fetchArticle } = await import("@/infrastructure/feeds/blog-library.server");
    const { importLibraryPost } = await import("@/application/import-library-post");
    const article = await fetchArticle(data.url);
    const post = await importLibraryPost(app, { ...article, url: data.url });
    const snapshot = await createCampaign(app, {
      postId: post.id,
      ...(data.name ? { name: data.name } : {}),
    });
    await generateImages(app, snapshot.campaign.id);
    return getCampaignSnapshot(app, snapshot.campaign.id);
  });
