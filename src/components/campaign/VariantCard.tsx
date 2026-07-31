import { PLATFORM_SPECS, type Platform } from "@/config/platform-specs";
import type { SocialPostEntry } from "@/lib/types";
import { StatusChip } from "./StatusChip";

interface Props {
  platform: Platform;
  caption: string;
  imageUrl: string;
  entry?: SocialPostEntry | undefined;
}

export function VariantCard({ platform, caption, imageUrl, entry }: Props) {
  const spec = PLATFORM_SPECS[platform];

  return (
    <article className="panel flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-base font-semibold">{spec.label}</h3>
          <p className="font-mono text-[11px] text-muted-foreground">
            {spec.width}×{spec.height} · {spec.aspectLabel} · ≤{spec.maxCaptionLength} chars
          </p>
        </div>
        {entry ? <StatusChip status={entry.status} /> : <span className="eyebrow">preview</span>}
      </header>

      <div className="bg-background/60 p-4">
        <img
          src={`${imageUrl}&guides=1`}
          alt={`${spec.label} variant, ${spec.aspectLabel}`}
          width={spec.width}
          height={spec.height}
          className="w-full rounded-lg border border-border"
          style={{ aspectRatio: `${spec.width} / ${spec.height}` }}
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{caption}</p>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
          <span>{caption.length} chars</span>
          {entry?.scheduledFor && entry.status === "queued" ? (
            <span>due {new Date(entry.scheduledFor).toLocaleTimeString()}</span>
          ) : null}
          {entry?.remoteId ? <span>{entry.remoteId}</span> : null}
        </div>
        {entry?.error ? <p className="text-xs text-status-failed">{entry.error}</p> : null}
      </div>
    </article>
  );
}
