import type {
  BlogPost,
  Campaign,
  Platform,
  SocialPostEntry,
} from "@/domain/entities";
import { buildIdempotencyKey } from "@/domain/entities";
import type {
  AppContext,
  Clock,
  PublishResult,
  SocialPublisher,
} from "@/domain/ports";
import { createInMemoryAiCostMeter } from "@/infrastructure/ai/ai-cost-meter.server";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export interface MockState {
  posts: BlogPost[];
  campaigns: Campaign[];
  entries: SocialPostEntry[];
  attempts: Array<{
    entryId: string;
    attemptNo: number;
    outcome: string;
    httpStatus?: number | null;
    retryAfterSec?: number | null;
    detail?: string | null;
  }>;
}

export interface MockAppOptions {
  userId?: string;
  clock?: Clock;
  publisher?: SocialPublisher | ((platform: Platform) => PublishResult | Promise<PublishResult>);
}

export function createMockAppContext(options: MockAppOptions = {}): {
  context: AppContext;
  state: MockState;
} {
  const userId = options.userId ?? "user-1";
  const fixedNow = new Date("2026-01-15T12:00:00.000Z");
  const clock: Clock = options.clock ?? { now: () => fixedNow };

  const state: MockState = {
    posts: [],
    campaigns: [],
    entries: [],
    attempts: [],
  };

  const publisherFor = (platform: Platform): SocialPublisher => ({
    platform,
    async publish() {
      if (typeof options.publisher === "function") {
        return options.publisher(platform);
      }
      if (options.publisher) return options.publisher.publish({} as never, "");
      return { outcome: "accepted", httpStatus: 200, remoteId: `remote-${platform}` };
    },
  });

  const context: AppContext = {
    userId,
    clock,
    posts: {
      async create(input) {
        const post: BlogPost = {
          id: nextId("post"),
          userId,
          title: input.title,
          body: input.body,
          url: input.url,
          source: input.source,
          createdAt: clock.now().toISOString(),
        };
        state.posts.push(post);
        return post;
      },
      async list() {
        return [...state.posts];
      },
      async findById(id) {
        return state.posts.find((p) => p.id === id) ?? null;
      },
      async delete(id) {
        state.posts = state.posts.filter((p) => p.id !== id);
      },
    },
    campaigns: {
      async create(input) {
        const campaign: Campaign = {
          id: nextId("campaign"),
          userId,
          postId: input.postId,
          name: input.name,
          status: "draft",
          scheduledFor: null,
          brandName: input.brandName ?? null,
          brandTone: input.brandTone ?? null,
          brandLanguage: input.brandLanguage ?? "en",
          createdAt: clock.now().toISOString(),
          updatedAt: clock.now().toISOString(),
        };
        state.campaigns.push(campaign);
        return campaign;
      },
      async list() {
        return [...state.campaigns];
      },
      async findById(id) {
        return state.campaigns.find((c) => c.id === id) ?? null;
      },
      async update(id, patch) {
        const idx = state.campaigns.findIndex((c) => c.id === id);
        if (idx < 0) throw new Error("campaign not found");
        state.campaigns[idx] = {
          ...state.campaigns[idx]!,
          ...patch,
          updatedAt: clock.now().toISOString(),
        };
        return state.campaigns[idx]!;
      },
      async delete(id) {
        state.campaigns = state.campaigns.filter((c) => c.id !== id);
      },
    },
    entries: {
      async upsertForCampaign(campaignId, rows) {
        const out: SocialPostEntry[] = [];
        for (const row of rows) {
          const existing = state.entries.find(
            (e) => e.campaignId === campaignId && e.platform === row.platform,
          );
          if (existing) {
            existing.caption = row.caption;
            out.push(existing);
            continue;
          }
          const entry: SocialPostEntry = {
            id: nextId("entry"),
            userId,
            campaignId,
            platform: row.platform,
            caption: row.caption,
            imagePath: null,
            imageWidth: null,
            imageHeight: null,
            status: "queued",
            scheduledFor: null,
            idempotencyKey: row.idempotencyKey,
            attempts: 0,
            leaseUntil: null,
            nextAttemptAt: null,
            remoteId: null,
            error: null,
            publishedAt: null,
            createdAt: clock.now().toISOString(),
            updatedAt: clock.now().toISOString(),
          };
          state.entries.push(entry);
          out.push(entry);
        }
        return out;
      },
      async listByCampaign(campaignId) {
        return state.entries.filter((e) => e.campaignId === campaignId);
      },
      async findById(id) {
        return state.entries.find((e) => e.id === id) ?? null;
      },
      async update(id, patch) {
        const idx = state.entries.findIndex((e) => e.id === id);
        if (idx < 0) throw new Error("entry not found");
        state.entries[idx] = {
          ...state.entries[idx]!,
          ...patch,
          updatedAt: clock.now().toISOString(),
        };
        return state.entries[idx]!;
      },
    },
    credentials: {
      async find() {
        return null;
      },
      async save() {},
    },
    attempts: {
      async record(input) {
        state.attempts.push(input);
      },
      async listByEntry(entryId) {
        return state.attempts
          .filter((a) => a.entryId === entryId)
          .map((a, i) => ({
            id: `attempt-${i}`,
            entryId: a.entryId,
            attemptNo: a.attemptNo,
            httpStatus: a.httpStatus ?? null,
            retryAfterSec: a.retryAfterSec ?? null,
            outcome: a.outcome,
            detail: a.detail ?? null,
            createdAt: clock.now().toISOString(),
          }));
      },
    },
    webhooks: {
      async record() {},
      async listRecent() {
        return [];
      },
    },
    aiCostMeter: createInMemoryAiCostMeter(),
    images: {
      async put(path) {
        return path;
      },
      async signedUrl() {
        return "https://example.com/signed";
      },
    },
    renderer: {
      name: "mock",
      async render(spec) {
        return {
          bytes: new Uint8Array([137, 80, 78, 71]),
          width: spec.width,
          height: spec.height,
          contentType: "image/png" as const,
          renderer: "mock",
        };
      },
    },
    captionWriter: {
      name: "mock",
      async write(post) {
        return post.title;
      },
    },
    parser: {
      async parse(_kind, data, filename) {
        const text = new TextDecoder().decode(data);
        return { title: filename, body: text };
      },
    },
    publisherFor,
  };

  return { context, state };
}

export function seedEntry(
  state: MockState,
  overrides: Partial<SocialPostEntry> & Pick<SocialPostEntry, "campaignId" | "platform">,
): SocialPostEntry {
  const entry: SocialPostEntry = {
    id: overrides.id ?? nextId("entry"),
    userId: overrides.userId ?? "user-1",
    campaignId: overrides.campaignId,
    platform: overrides.platform,
    caption: overrides.caption ?? "Test caption",
    imagePath: "imagePath" in overrides ? overrides.imagePath! : "user/campaign/x.png",
    imageWidth: overrides.imageWidth ?? 1600,
    imageHeight: overrides.imageHeight ?? 900,
    status: overrides.status ?? "queued",
    scheduledFor: overrides.scheduledFor ?? null,
    idempotencyKey:
      overrides.idempotencyKey ?? buildIdempotencyKey(overrides.campaignId, overrides.platform),
    attempts: overrides.attempts ?? 0,
    leaseUntil: overrides.leaseUntil ?? null,
    nextAttemptAt: overrides.nextAttemptAt ?? null,
    remoteId: overrides.remoteId ?? null,
    error: overrides.error ?? null,
    publishedAt: overrides.publishedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-01-15T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-15T12:00:00.000Z",
  };
  state.entries.push(entry);
  return entry;
}

export function seedCampaign(state: MockState, overrides: Partial<Campaign> = {}): Campaign {
  const campaign: Campaign = {
    id: overrides.id ?? nextId("campaign"),
    userId: overrides.userId ?? "user-1",
    postId: overrides.postId ?? "post-1",
    name: overrides.name ?? "Test campaign",
    status: overrides.status ?? "draft",
    scheduledFor: overrides.scheduledFor ?? null,
    brandName: overrides.brandName ?? null,
    brandTone: overrides.brandTone ?? null,
    brandLanguage: overrides.brandLanguage ?? "en",
    createdAt: overrides.createdAt ?? "2026-01-15T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-15T12:00:00.000Z",
  };
  state.campaigns.push(campaign);
  return campaign;
}
