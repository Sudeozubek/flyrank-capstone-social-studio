/**
 * Domain ports (interfaces). The application layer depends only on these.
 * Every concrete Postgres / HTTP / imaging detail lives behind one of them.
 */

import type {
  BlogPost,
  BrandContext,
  Campaign,
  CampaignStatus,
  EntryStatus,
  Platform,
  PlatformCredential,
  PublishAttempt,
  SocialPostEntry,
  WebhookEvent,
} from "./entities";

export interface Clock {
  now(): Date;
}

export interface PostRepository {
  create(input: Pick<BlogPost, "title" | "body" | "url" | "source">): Promise<BlogPost>;
  list(): Promise<BlogPost[]>;
  findById(id: string): Promise<BlogPost | null>;
  delete(id: string): Promise<void>;
}

export interface CampaignRepository {
  create(input: {
    postId: string;
    name: string;
    brandName?: string | null;
    brandTone?: string | null;
    brandLanguage?: string | null;
  }): Promise<Campaign>;
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  update(
    id: string,
    patch: Partial<Pick<Campaign, "status" | "scheduledFor" | "name" | "brandName" | "brandTone" | "brandLanguage">>,
  ): Promise<Campaign>;
  delete(id: string): Promise<void>;
}

export interface EntryRepository {
  upsertForCampaign(
    campaignId: string,
    entries: Array<{ platform: Platform; caption: string; idempotencyKey: string }>,
  ): Promise<SocialPostEntry[]>;
  listByCampaign(campaignId: string): Promise<SocialPostEntry[]>;
  findById(id: string): Promise<SocialPostEntry | null>;
  update(id: string, patch: EntryPatch): Promise<SocialPostEntry>;
}

export interface EntryPatch {
  caption?: string;
  imagePath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  status?: EntryStatus;
  scheduledFor?: string | null;
  attempts?: number;
  leaseUntil?: string | null;
  nextAttemptAt?: string | null;
  remoteId?: string | null;
  error?: string | null;
  publishedAt?: string | null;
}

export interface CredentialRepository {
  find(platform: Platform): Promise<PlatformCredential | null>;
  save(credential: PlatformCredential): Promise<void>;
}

export interface AttemptRepository {
  record(input: {
    entryId: string;
    attemptNo: number;
    httpStatus?: number | null;
    retryAfterSec?: number | null;
    outcome: string;
    detail?: string | null;
  }): Promise<void>;
  listByEntry(entryId: string): Promise<PublishAttempt[]>;
}

export interface WebhookEventRepository {
  record(input: {
    entryId?: string | null;
    platform?: Platform | null;
    signatureValid: boolean;
    httpStatus: number;
    payloadDigest: string;
    message?: string | null;
    userId?: string | null;
  }): Promise<void>;
  listRecent(limit?: number): Promise<WebhookEvent[]>;
}

/** The single publishing interface the application depends on (Adapter Pattern). */
export interface SocialPublisher {
  readonly platform: Platform;
  publish(input: PublishInput, idempotencyKey: string): Promise<PublishResult>;
}

export interface PublishInput {
  campaignId: string;
  entryId: string;
  userId: string;
  platform: Platform;
  caption: string;
  imageRef: string;
}

export type PublishOutcome = "accepted" | "duplicate" | "rate_limited" | "failed";

export interface PublishResult {
  outcome: PublishOutcome;
  remoteId?: string;
  retryAfterSec?: number;
  httpStatus?: number;
  error?: string;
}

export interface RenderedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  contentType: "image/png";
  renderer: string;
}

export interface ImageRenderer {
  readonly name: string;
  render(spec: {
    platform: Platform;
    width: number;
    height: number;
    title: string;
    body?: string;
    seed: string;
    brand: string;
    brandTone?: string | null;
    brandLanguage?: string | null;
    subject: { x: number; y: number; width: number; height: number };
  }): Promise<RenderedImage>;
}

export interface ImageStore {
  put(path: string, image: RenderedImage): Promise<string>;
  signedUrl(path: string, expiresInSec?: number): Promise<string | null>;
}

/** Writes the final platform-specific caption from a post (LLM-backed adapter). */
export interface CaptionWriter {
  readonly name: string;
  write(
    post: { id: string; title: string; body: string; url?: string | null },
    platform: Platform,
    brand?: BrandContext,
  ): Promise<string>;
}

export interface ParsedDocument {
  title: string;
  body: string;
}


export interface DocumentParser {
  /** @param kind mime-ish hint: markdown | pdf | docx */
  parse(kind: "markdown" | "pdf" | "docx", data: Uint8Array, filename: string): Promise<ParsedDocument>;
}

export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
}

/** Everything a use case may reach for, injected at the composition root. */
export interface AppContext {
  userId: string;
  clock: Clock;
  posts: PostRepository;
  campaigns: CampaignRepository;
  entries: EntryRepository;
  credentials: CredentialRepository;
  attempts: AttemptRepository;
  webhooks: WebhookEventRepository;
  images: ImageStore;
  renderer: ImageRenderer;
  captionWriter: CaptionWriter;
  parser: DocumentParser;

  publisherFor(platform: Platform): SocialPublisher;
}

export type { CampaignStatus };
