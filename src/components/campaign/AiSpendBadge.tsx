import type { AiSpendSnapshot } from "@/domain/ai-spend";
import { aiSpendStatusLabel, formatAiUsd } from "@/domain/ai-spend";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function statusTone(status: AiSpendSnapshot["status"]): string {
  switch (status) {
    case "ok":
      return "border-status-published/35 bg-status-published/8 text-status-published";
    case "warning":
      return "border-status-publishing/40 bg-status-publishing/10 text-status-publishing";
    case "critical":
    case "exhausted":
      return "border-status-failed/40 bg-status-failed/10 text-status-failed";
    case "disabled":
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function AiSpendBadge({ spend }: { spend: AiSpendSnapshot }) {
  const label = spend.openAiConfigured
    ? `${formatAiUsd(spend.spendUsd)} / ${formatAiUsd(spend.budgetUsd)}`
    : "No API key";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "hidden cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide sm:inline-flex",
              statusTone(spend.status),
            )}
            aria-label={`AI spend ${label}`}
          >
            <span className="opacity-70">AI</span>
            <span className="h-3 w-px bg-current/25" aria-hidden />
            <span>{label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs border border-border bg-popover text-popover-foreground"
        >
          <p className="font-medium">{aiSpendStatusLabel(spend.status)}</p>
          <p className="mt-1 text-muted-foreground">
            {spend.callCount === 0
              ? "No OpenAI calls this session yet."
              : `${spend.callCount} call${spend.callCount === 1 ? "" : "s"} · ${spend.percentUsed.toFixed(0)}% of session budget`}
          </p>
          {!spend.openAiConfigured ? (
            <p className="mt-1 text-muted-foreground">
              Set OPENAI_API_KEY to enable LLM captions and AI images.
            </p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
