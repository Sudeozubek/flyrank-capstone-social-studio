import { describe, expect, it } from "vitest";
import { snapshotView } from "@/mcp/views";
import type { BlogPost, Campaign, SocialPostEntry } from "@/domain/entities";

const post: BlogPost = {
  id: "post-1",
  userId: "user-1",
  title: "Shipping the worker",
  body: "x".repeat(2000),
  url: "https://example.com/post",
  source: "paste",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const campaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  postId: "post-1",
  name: "Shipping the worker",
  status: "scheduled",
  scheduledFor: "2026-02-01T09:00:00.000Z",
  brandName: "Acme",
  brandTone: "professional",
  brandLanguage: "en",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const entry: SocialPostEntry = {
  id: "entry-1",
  userId: "user-1",
  campaignId: "campaign-1",
  platform: "x",
  caption: "hello",
  imagePath: "user-1/campaign-1/x.png",
  imageWidth: 1600,
  imageHeight: 900,
  status: "queued",
  scheduledFor: "2026-02-01T09:00:00.000Z",
  idempotencyKey: "flyrank:campaign-1:x",
  attempts: 1,
  leaseUntil: "2026-02-01T09:00:30.000Z",
  nextAttemptAt: "2026-02-01T09:00:00.000Z",
  remoteId: null,
  error: null,
  publishedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("MCP wire views", () => {
  const view = snapshotView({ campaign, post, entries: [entry] });

  it("keeps the fields a caller acts on", () => {
    expect(view.campaign.id).toBe("campaign-1");
    expect(view.campaign.postId).toBe("post-1");
    expect(view.entries[0]?.platform).toBe("x");
    expect(view.entries[0]?.caption).toBe("hello");
    expect(view.entries[0]?.hasImage).toBe(true);
  });

  it("drops server-internal fields", () => {
    const serialised = JSON.stringify(view);
    expect(serialised).not.toContain("idempotencyKey");
    expect(serialised).not.toContain("leaseUntil");
    expect(serialised).not.toContain("userId");
    expect(serialised).not.toContain("imagePath");
  });

  it("truncates the post body instead of echoing it whole", () => {
    expect(view.post.bodyPreview.length).toBeLessThan(post.body.length);
    expect(view.post.bodyPreview.endsWith("…")).toBe(true);
    expect(view.post.bodyLength).toBe(2000);
  });
});
