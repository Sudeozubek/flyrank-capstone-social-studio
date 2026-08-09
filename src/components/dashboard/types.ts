import type { CampaignSnapshot } from "@/domain/entities";

export type DashboardCampaignSnapshot = CampaignSnapshot & {
  images: Record<string, string | null>;
};

export type DashboardView = "campaigns" | "library" | "activity";
