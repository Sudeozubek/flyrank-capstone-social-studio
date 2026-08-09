import type { CampaignSnapshot } from "@/domain/entities";

export type DashboardCampaignSnapshot = CampaignSnapshot & {
  /** Full-resolution stable proxy URLs (detail / variant gallery). */
  images: Record<string, string | null>;
  /** 640px thumbnails for library grid — smaller payload, same stable URL. */
  thumbImages: Record<string, string | null>;
};

export type DashboardView = "campaigns" | "library" | "activity";
