import type { Platform } from "@/domain/entities";
import { PLATFORMS } from "@/domain/entities";
import type { DashboardCampaignSnapshot } from "@/components/dashboard/types";

export type PlatformFilter = "all" | Platform;

export function pickThumbnail(snapshot: DashboardCampaignSnapshot): string | null {
  for (const platform of PLATFORMS) {
    const url = snapshot.thumbImages[platform];
    if (url) return url;
  }
  return null;
}

export function filterCampaigns(
  campaigns: DashboardCampaignSnapshot[],
  query: string,
  platform: PlatformFilter,
): DashboardCampaignSnapshot[] {
  const q = query.trim().toLowerCase();
  return campaigns.filter((snapshot) => {
    if (q) {
      const haystack = [
        snapshot.campaign.name,
        snapshot.post.title,
        snapshot.post.url ?? "",
        snapshot.post.source,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (platform !== "all") {
      return snapshot.entries.some((e) => e.platform === platform);
    }
    return true;
  });
}

export function entriesForFilter(
  snapshot: DashboardCampaignSnapshot,
  platform: PlatformFilter,
): DashboardCampaignSnapshot["entries"] {
  if (platform === "all") {
    return [...snapshot.entries].sort(
      (a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform),
    );
  }
  return snapshot.entries.filter((e) => e.platform === platform);
}
