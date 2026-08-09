import { cn } from "@/lib/utils";

const ITEMS = [
  {
    key: "queued",
    label: "Queued",
    tone: "border-status-queued/30 bg-status-queued/12 text-status-queued",
  },
  {
    key: "publishing",
    label: "Publishing",
    tone: "border-status-publishing/30 bg-status-publishing/12 text-status-publishing",
  },
  {
    key: "published",
    label: "Published",
    tone: "border-status-published/30 bg-status-published/12 text-status-published",
  },
  {
    key: "failed",
    label: "Failed",
    tone: "border-status-failed/30 bg-status-failed/12 text-status-failed",
  },
] as const;

export function StatusSummaryPills({ totals }: { totals: Record<string, number> }) {
  const hasActivity = ITEMS.some(({ key }) => (totals[key] ?? 0) > 0);

  return (
    <section className="dashboard-panel rounded-xl border border-border bg-surface px-4 py-3 shadow-sm sm:px-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Delivery pipeline
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {ITEMS.map(({ key, label, tone }) => (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium",
              tone,
              !hasActivity && (totals[key] ?? 0) === 0 && "opacity-70",
            )}
          >
            <span className="size-2 rounded-full bg-current" />
            {label}
            <span className="tabular-nums font-semibold">{totals[key] ?? 0}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
