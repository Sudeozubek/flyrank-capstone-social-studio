import type { AiSpendSnapshot } from "@/domain/ai-spend";
import { aiSpendStatusLabel, formatAiUsd } from "@/domain/ai-spend";
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

export function AiSpendPanel({ spend }: { spend: AiSpendSnapshot }) {
  const showFallbackNote =
    spend.status === "exhausted" || spend.status === "critical" || spend.status === "disabled";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface p-5",
        spend.status === "critical" || spend.status === "exhausted"
          ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-status-failed/60 before:to-transparent"
          : spend.status === "warning"
            ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-status-publishing/50 before:to-transparent"
            : null,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Observability</p>
          <h2 className="font-display text-lg text-foreground">AI spend</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Session meter for OpenAI captions, art direction and image generation.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset",
            statusPillClass(spend.status),
          )}
        >
          {aiSpendStatusLabel(spend.status)}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-2xl tabular-nums tracking-tight text-foreground">
              {formatAiUsd(spend.spendUsd)}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              of {formatAiUsd(spend.budgetUsd)} session budget
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
        <p className="mt-4 rounded-lg border border-border/80 bg-background/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {spend.status === "disabled" ? (
            <>
              <span className="font-medium text-foreground">No OpenAI key.</span> Captions use the
              deterministic composer; images use the SVG renderer — zero API cost.
            </>
          ) : spend.status === "exhausted" ? (
            <>
              <span className="font-medium text-foreground">Budget exhausted.</span> New campaigns
              will use free fallbacks until the server restarts or you raise{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                AI_BUDGET_USD
              </code>
              .
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Budget nearly full.</span> The next
              generation may switch to deterministic captions and SVG images.
            </>
          )}
        </p>
      ) : null}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Recent calls
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground">
            {spend.callCount} total
          </span>
        </div>

        <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
          {spend.recent.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Generate a campaign to see attributed OpenAI usage here.
            </li>
          ) : (
            spend.recent.map((row, index) => {
              const tokens = tokenSummary(row.inputTokens, row.outputTokens);
              return (
                <li
                  key={`${row.at}-${row.feature}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {row.featureLabel}
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {row.model}
                      {tokens ? ` · ${tokens}` : " · flat rate"}
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
    </section>
  );
}
