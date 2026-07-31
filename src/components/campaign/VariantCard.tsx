import { PLATFORM_SPECS } from "@/config/platform-specs";
import type { SocialPostEntry } from "@/domain/entities";
import { StatusChip } from "./StatusChip";

export function VariantCard({
  entry,
  imageUrl,
}: {
  entry: SocialPostEntry;
  imageUrl: string | null;
}) {
  const spec = PLATFORM_SPECS[entry.platform];
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{spec.label}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {spec.width}×{spec.height} · {spec.aspectLabel}
          </span>
        </div>
        <StatusChip status={entry.status} />
      </header>

      <div className="bg-background/60 p-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${spec.label} variant for this campaign`}
            width={spec.width}
            height={spec.height}
            loading="lazy"
            className="w-full rounded-lg border border-border"
            style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground"
            style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
          >
            No variant rendered yet
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {entry.caption}
        </p>
        <dl className="grid grid-cols-3 gap-2 font-mono text-[11px] text-muted-foreground">
          <div>
            <dt>chars</dt>
            <dd className="text-foreground/80">
              {entry.caption.length}/{spec.maxCaptionLength}
            </dd>
          </div>
          <div>
            <dt>attempts</dt>
            <dd className="text-foreground/80">{entry.attempts}</dd>
          </div>
          <div>
            <dt>remote id</dt>
            <dd className="truncate text-foreground/80">{entry.remoteId ?? "—"}</dd>
          </div>
        </dl>
        {entry.error ? (
          <p className="rounded-md border border-status-failed/40 bg-status-failed/10 px-2 py-1 font-mono text-[11px] text-status-failed">
            {entry.error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
