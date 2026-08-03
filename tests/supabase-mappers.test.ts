import { describe, expect, it } from "vitest";
import {
  toCampaign,
  toEntry,
  toPost,
} from "@/infrastructure/persistence/supabase-repositories.server";
import { imagePath } from "@/infrastructure/storage/image-store.server";

describe("Supabase row mappers", () => {
  it("maps blog_posts rows to BlogPost entities", () => {
    const post = toPost({
      id: "p1",
      user_id: "u1",
      title: "Hello",
      body: "Body text",
      url: "https://example.com",
      source: "paste",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(post).toEqual({
      id: "p1",
      userId: "u1",
      title: "Hello",
      body: "Body text",
      url: "https://example.com",
      source: "paste",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("maps campaigns rows with nullable brand fields", () => {
    const campaign = toCampaign({
      id: "c1",
      user_id: "u1",
      post_id: "p1",
      name: "Launch",
      status: "draft",
      scheduled_for: null,
      brand_name: null,
      brand_tone: "professional",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    });
    expect(campaign.brandName).toBeNull();
    expect(campaign.brandTone).toBe("professional");
    expect(campaign.scheduledFor).toBeNull();
  });

  it("maps social_post_entries rows to SocialPostEntry entities", () => {
    const entry = toEntry({
      id: "e1",
      user_id: "u1",
      campaign_id: "c1",
      platform: "x",
      caption: "Caption",
      image_path: "u1/c1/x.png",
      image_width: 1600,
      image_height: 900,
      status: "queued",
      scheduled_for: "2026-01-03T00:00:00Z",
      idempotency_key: "flyrank:c1:x",
      attempts: 0,
      lease_until: null,
      next_attempt_at: null,
      remote_id: null,
      error: null,
      published_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(entry.platform).toBe("x");
    expect(entry.imagePath).toBe("u1/c1/x.png");
    expect(entry.idempotencyKey).toBe("flyrank:c1:x");
  });
});

describe("imagePath", () => {
  it("builds owner-scoped storage paths", () => {
    expect(imagePath("user-abc", "campaign-xyz", "instagram")).toBe(
      "user-abc/campaign-xyz/instagram.png",
    );
  });
});
