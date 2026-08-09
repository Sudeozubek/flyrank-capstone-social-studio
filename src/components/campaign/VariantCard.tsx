import { PLATFORM_SPECS } from "@/config/platform-specs";
import type { SocialPostEntry } from "@/domain/entities";
import { StatusChip } from "./StatusChip";
import { cn } from "@/lib/utils";

/** Fixed outer height so Instagram / X / LinkedIn slides are identical. */
export const VARIANT_CARD_HEIGHT = "h-[400px]";

export function VariantCard({
  entry,
  imageUrl,
  slideIndex,
  slideCount,
  layout = "stacked",
}: {
  entry: SocialPostEntry;
  imageUrl: string | null;
  slideIndex?: number;
  slideCount?: number;
  layout?: "stacked" | "wide";
}) {
  const spec = PLATFORM_SPECS[entry.platform];
  const wide = layout === "wide";

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-surface",
        wide && VARIANT_CARD_HEIGHT,
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-medium text-foreground">{spec.label}</span>
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
            {spec.width}×{spec.height}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {slideCount != null && slideIndex != null ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {slideIndex + 1}/{slideCount}
            </span>
          ) : null}
          <StatusChip status={entry.status} />
        </div>
      </header>

      <div
        className={cn("min-h-0 flex-1", wide ? "grid grid-cols-1 lg:grid-cols-2" : "flex flex-col")}
      >
        {/* Image frame — fixed height, image scales inside without resizing the card */}
        <div
          className={cn(
            "flex min-h-0 items-center justify-center bg-background/50 p-3",
            wide ? "h-full border-b border-border lg:border-b-0 lg:border-r" : "h-36 shrink-0",
          )}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${spec.label} variant`}
              loading="lazy"
              className="max-h-full max-w-full rounded-md border border-border object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
              No image yet
            </div>
          )}
        </div>

        {/* Caption column — same height as image column, scroll inside */}
        <div
          className={cn("flex min-h-0 min-w-0 flex-col p-3", wide ? "h-full" : "min-h-0 flex-1")}
        >
          <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {entry.caption}
          </p>
          <dl className="mt-2 grid shrink-0 grid-cols-3 gap-1 border-t border-border/60 pt-2 font-mono text-[10px] text-muted-foreground">
            <div>
              <dt>chars</dt>
              <dd className="text-foreground/80">
                {entry.caption.length}/{spec.maxCaptionLength}
              </dd>
            </div>
            <div>
              <dt>tries</dt>
              <dd className="text-foreground/80">{entry.attempts}</dd>
            </div>
            <div>
              <dt>remote</dt>
              <dd className="truncate text-foreground/80">{entry.remoteId ?? "—"}</dd>
            </div>
          </dl>
          {entry.error ? (
            <p className="mt-1 shrink-0 truncate rounded border border-status-failed/40 bg-status-failed/10 px-2 py-0.5 font-mono text-[10px] text-status-failed">
              {entry.error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
