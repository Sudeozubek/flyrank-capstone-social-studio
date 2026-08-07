/**
 * AI spend shapes and formatters — safe for client + server.
 */

export type AiSpendStatus = "disabled" | "ok" | "warning" | "critical" | "exhausted";

export interface AiUsageRow {
  feature: string;
  featureLabel: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  at: string;
}

export interface AiSpendSnapshot {
  budgetUsd: number;
  spendUsd: number;
  percentUsed: number;
  callCount: number;
  openAiConfigured: boolean;
  canSpendMore: boolean;
  status: AiSpendStatus;
  recent: AiUsageRow[];
}

export function formatAiFeatureLabel(feature: string): string {
  const [kind, platform] = feature.split(":");
  const platformLabel =
    platform === "x"
      ? "X"
      : platform === "linkedin"
        ? "LinkedIn"
        : platform
          ? platform.charAt(0).toUpperCase() + platform.slice(1)
          : "";
  if (kind === "caption") return platformLabel ? `Caption · ${platformLabel}` : "Caption";
  if (kind === "image") return platformLabel ? `Image · ${platformLabel}` : "Image";
  if (kind === "art-director") return platformLabel ? `Art direction · ${platformLabel}` : "Art direction";
  return feature;
}

/** Human-readable USD — more precision when amounts are tiny. */
export function formatAiUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "$0.00";
  if (amount < 0.0001) return `<$0.0001`;
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function aiSpendStatusLabel(status: AiSpendStatus): string {
  switch (status) {
    case "disabled":
      return "Deterministic mode";
    case "ok":
      return "Within budget";
    case "warning":
      return "Running low";
    case "critical":
      return "Nearly exhausted";
    case "exhausted":
      return "Budget exhausted";
  }
}
