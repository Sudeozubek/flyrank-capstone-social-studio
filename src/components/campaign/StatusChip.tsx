import { cn } from "@/lib/utils";
import type { EntryStatus, CampaignStatus } from "@/domain/entities";

const ENTRY_STYLES: Record<EntryStatus, string> = {
  queued: "text-status-queued border-status-queued/40 bg-status-queued/10",
  publishing: "text-status-publishing border-status-publishing/40 bg-status-publishing/10",
  published: "text-status-published border-status-published/40 bg-status-published/10",
  failed: "text-status-failed border-status-failed/40 bg-status-failed/10",
};

const CAMPAIGN_STYLES: Record<CampaignStatus, string> = {
  draft: "text-muted-foreground border-border bg-muted/40",
  scheduled: "text-status-queued border-status-queued/40 bg-status-queued/10",
  publishing: "text-status-publishing border-status-publishing/40 bg-status-publishing/10",
  completed: "text-status-published border-status-published/40 bg-status-published/10",
  failed: "text-status-failed border-status-failed/40 bg-status-failed/10",
};

export function StatusChip({
  status,
  kind = "entry",
  className,
}: {
  status: EntryStatus | CampaignStatus;
  kind?: "entry" | "campaign";
  className?: string;
}) {
  const styles =
    kind === "entry"
      ? ENTRY_STYLES[status as EntryStatus]
      : CAMPAIGN_STYLES[status as CampaignStatus];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        styles,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
