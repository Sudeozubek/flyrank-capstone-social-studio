import { PLATFORM_SPECS } from "@/config/platform-specs";
import { interpolate } from "@/i18n/dashboard/catalog";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import type { SocialPostEntry } from "@/domain/entities";
import { StatusChip } from "@/components/campaign/StatusChip";
import { cn } from "@/lib/utils";

/** Uniform tile height for the campaign library grid. */
export const LIBRARY_VARIANT_CARD_HEIGHT = "h-[24rem]";

const IMAGE_HEIGHT = "h-[11.5rem]";

export function LibraryVariantCard({
  entry,
  imageUrl,
  className,
}: {
  entry: SocialPostEntry;
  imageUrl: string | null;
  className?: string;
}) {
  const { t } = useDashboardI18n();
  const spec = PLATFORM_SPECS[entry.platform];

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border/80 bg-surface shadow-sm",
        LIBRARY_VARIANT_CARD_HEIGHT,
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="truncate text-xs font-medium text-foreground">{spec.label}</p>
        <StatusChip status={entry.status} className="shrink-0 scale-90" />
      </header>

      <div className={cn("relative shrink-0 overflow-hidden bg-muted/30", IMAGE_HEIGHT)}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={interpolate(t.variant.previewAlt, { platform: spec.label })}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            {t.variant.noImage}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-border/60 p-3">
        <p className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
          {entry.caption}
        </p>
      </div>
    </article>
  );
}
