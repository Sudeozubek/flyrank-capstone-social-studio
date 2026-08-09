import { describe, expect, it } from "vitest";
import { filterCampaigns, entriesForFilter } from "@/components/dashboard/campaign-library-utils";
import type { DashboardCampaignSnapshot } from "@/components/dashboard/types";

function snapshot(
  overrides: Partial<{
    id: string;
    name: string;
    title: string;
    url: string | null;
    platforms: Array<"instagram" | "x" | "linkedin">;
  }> = {},
): DashboardCampaignSnapshot {
  const id = overrides.id ?? "c1";
  const platforms = overrides.platforms ?? ["instagram", "x", "linkedin"];
  return {
    campaign: {
      id,
      userId: "u1",
      postId: "p1",
      name: overrides.name ?? "Launch post",
      status: "draft",
      brandName: null,
      brandTone: null,
      brandLanguage: "en",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledFor: null,
    },
    post: {
      id: "p1",
      userId: "u1",
      title: overrides.title ?? "Launch post",
      body: "body",
      url: overrides.url ?? "https://blog.example.com/launch",
      source: "paste",
      createdAt: new Date().toISOString(),
    },
    entries: platforms.map((platform) => ({
      id: `${id}-${platform}`,
      userId: "u1",
      campaignId: id,
      platform,
      caption: "caption",
      status: "queued" as const,
      attempts: 0,
      remoteId: null,
      error: null,
      imagePath: null,
      imageWidth: null,
      imageHeight: null,
      idempotencyKey: `key-${platform}`,
      scheduledFor: null,
      leaseUntil: null,
      nextAttemptAt: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    images: Object.fromEntries(platforms.map((p) => [p, null])),
    thumbImages: Object.fromEntries(platforms.map((p) => [p, null])),
  };
}

describe("filterCampaigns", () => {
  const items = [
    snapshot({ id: "a", name: "Alpha launch", url: "https://a.test/one" }),
    snapshot({ id: "b", name: "Beta recap", url: "https://b.test/two", platforms: ["x"] }),
  ];

  it("filters by search query", () => {
    expect(filterCampaigns(items, "beta", "all")).toHaveLength(1);
    expect(filterCampaigns(items, "b.test", "all")[0]?.campaign.id).toBe("b");
  });

  it("filters by platform", () => {
    expect(filterCampaigns(items, "", "instagram")).toHaveLength(1);
    expect(filterCampaigns(items, "", "x")).toHaveLength(2);
  });
});

describe("entriesForFilter", () => {
  it("returns only the selected platform", () => {
    const item = snapshot();
    expect(entriesForFilter(item, "linkedin")).toHaveLength(1);
    expect(entriesForFilter(item, "linkedin")[0]?.platform).toBe("linkedin");
  });
});
