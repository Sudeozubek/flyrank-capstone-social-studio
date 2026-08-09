import type { AiSpendSnapshot } from "@/domain/ai-spend";
import { aiSpendStatusLabel, formatAiUsd } from "@/domain/ai-spend";
import type { DashboardMessages } from "@/i18n/types";
import { interpolate } from "@/i18n/dashboard/catalog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function progressClass(status: AiSpendSnapshot["status"]): string {
  switch (status) {
    case "ok":
      return "[&>div]:bg-status-published";
    case "warning":
      return "[&>div]:bg-status-publishing";
    case "critical":
    case "exhausted":
      return "[&>div]:bg-status-failed";
    case "disabled":
      return "[&>div]:bg-muted-foreground/50";
  }
}

function statusPillClass(status: AiSpendSnapshot["status"]): string {
  switch (status) {
    case "ok":
      return "bg-status-published/12 text-status-published ring-status-published/25";
    case "warning":
      return "bg-status-publishing/12 text-status-publishing ring-status-publishing/25";
    case "critical":
    case "exhausted":
      return "bg-status-failed/12 text-status-failed ring-status-failed/25";
    case "disabled":
      return "bg-muted text-muted-foreground ring-border";
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function tokenSummary(input: number, output: number): string | null {
  const total = input + output;
  if (total <= 0) return null;
  return `${total.toLocaleString()} tok`;
}

export function AiSpendPanel({
  spend,
  compact = false,
  embedded = false,
  labels,
}: {
  spend: AiSpendSnapshot;
  compact?: boolean;
  /** Solid dashboard surfaces (Activity page) instead of translucent rows */
  embedded?: boolean;
  labels?: DashboardMessages["aiSpend"];
}) {
  const showFallbackNote =
    spend.status === "exhausted" || spend.status === "critical" || spend.status === "disabled";
  const statusLabel = labels?.status[spend.status] ?? aiSpendStatusLabel(spend.status);

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        compact ? "p-4 sm:p-5" : "rounded-2xl border border-border bg-surface p-5",
        !compact &&
          (spend.status === "critical" || spend.status === "exhausted"
            ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-status-failed/60 before:to-transparent"
            : spend.status === "warning"
              ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-status-publishing/50 before:to-transparent"
              : null),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {!compact ? <p className="eyebrow mb-1">Observability</p> : null}
          <h2 className={cn("font-display text-foreground", compact ? "text-base" : "text-lg")}>
            {labels?.title ?? "AI spend"}
          </h2>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Session meter for OpenAI captions, art direction and image generation.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {labels?.subtitle ?? "OpenAI session budget"}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset",
            statusPillClass(spend.status),
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div
        className={cn(
          embedded && "dashboard-activity-inset mx-4 mb-4 space-y-4 rounded-xl p-4 sm:mx-5 sm:mb-5",
        )}
      >
        <div className={cn(!embedded && "mt-5", "space-y-2")}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-2xl tabular-nums tracking-tight text-foreground">
                {formatAiUsd(spend.spendUsd)}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {labels
                  ? interpolate(labels.ofBudget, { budget: formatAiUsd(spend.budgetUsd) })
                  : `of ${formatAiUsd(spend.budgetUsd)} session budget`}
              </p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {spend.percentUsed.toFixed(0)}%
            </p>
          </div>
          <Progress
            value={spend.percentUsed}
            className={cn("h-2 bg-muted/80", progressClass(spend.status))}
          />
        </div>

        {showFallbackNote ? (
          <p
            className={cn(
              "rounded-lg border px-3 py-2.5 text-xs leading-relaxed text-foreground/80",
              embedded
                ? "dashboard-activity-row"
                : "mt-4 border-border/80 bg-background/50 text-muted-foreground",
            )}
          >
            {spend.status === "disabled" ? (
              <>
                <span className="font-medium text-foreground">
                  {labels?.notes.noKeyTitle ?? "No OpenAI key."}
                </span>{" "}
                {labels?.notes.noKeyBody ??
                  "Captions use the deterministic composer; images use the SVG renderer — zero API cost."}
              </>
            ) : spend.status === "exhausted" ? (
              <>
                <span className="font-medium text-foreground">
                  {labels?.notes.exhaustedTitle ?? "Budget exhausted."}
                </span>{" "}
                {labels?.notes.exhaustedBody ??
                  "New campaigns will use free fallbacks until the server restarts or you raise"}{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  {labels?.notes.exhaustedEnv ?? "AI_BUDGET_USD"}
                </code>
                .
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {labels?.notes.criticalTitle ?? "Budget nearly full."}
                </span>{" "}
                {labels?.notes.criticalBody ??
                  "The next generation may switch to deterministic captions and SVG images."}
              </>
            )}
          </p>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {labels?.recentCalls ?? "Recent calls"}
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              {labels
                ? interpolate(labels.totalCalls, { count: spend.callCount })
                : `${spend.callCount} total`}
            </span>
          </div>

          <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
            {spend.recent.length === 0 ? (
              <li
                className={cn(
                  "rounded-lg border border-dashed px-3 py-6 text-center text-xs",
                  embedded
                    ? "dashboard-activity-row text-muted-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {labels?.emptyRecent ??
                  "Generate a campaign to see attributed OpenAI usage here."}
              </li>
            ) : (
              spend.recent.map((row, index) => {
                const tokens = tokenSummary(row.inputTokens, row.outputTokens);
                return (
                  <li
                    key={`${row.at}-${row.feature}-${index}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      embedded
                        ? "dashboard-activity-row"
                        : "border-border/80 bg-background/40",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {row.featureLabel}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {row.model}
                        {tokens
                          ? ` · ${labels ? interpolate(labels.tokens, { count: row.inputTokens + row.outputTokens }) : tokens}`
                          : ` · ${labels?.flatRate ?? "flat rate"}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[11px] tabular-nums text-foreground">
                        {formatAiUsd(row.estimatedUsd)}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {formatTime(row.at)}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
