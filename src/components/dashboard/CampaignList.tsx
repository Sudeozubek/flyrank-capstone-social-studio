import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  FileInput,
  Layers,
  Send,
  Sparkles,
} from "lucide-react";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import type { DashboardCampaignSnapshot } from "@/components/dashboard/types";
import { StatusChip } from "@/components/campaign/StatusChip";
import { Button } from "@/components/ui/button";
import { PLATFORMS } from "@/domain/entities";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: FileInput,
    title: "Pick content",
    body: "Choose a blog post from the library or paste your own.",
  },
  {
    icon: Sparkles,
    title: "Generate variants",
    body: "AI creates captions and images for Instagram, X and LinkedIn.",
  },
  {
    icon: Send,
    title: "Publish",
    body: "Review variants, schedule or publish with one click.",
  },
] as const;

function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function platformSummary(entries: DashboardCampaignSnapshot["entries"]): string {
  const published = entries.filter((e) => e.status === "published").length;
  return `${published}/${entries.length} live`;
}

function pickThumbnail(snapshot: DashboardCampaignSnapshot): string | null {
  for (const platform of PLATFORMS) {
    const url = snapshot.images[platform];
    if (url) return url;
  }
  return null;
}

function CampaignEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="dashboard-panel dashboard-empty-glow relative overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-[0_24px_60px_-24px_oklch(0.4_0.08_35_/_0.25)] light:border-border/80 light:shadow-none">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl light:bg-primary/8" />
        <div className="absolute -bottom-12 -right-12 size-48 rounded-full bg-status-published/10 blur-3xl light:bg-status-published/6" />
      </div>

      <div className="relative px-6 py-10 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary light:border-border light:bg-surface-raised/80 light:text-foreground/80">
            <Sparkles className="size-3.5" />
            Get started in under a minute
          </div>

          <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
            Create your first
            <span className="text-primary"> campaign</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Turn one blog post into platform-ready social posts — captions, images and scheduling
            included.
          </p>

          <Button
            size="lg"
            className="mt-8 gap-2 px-8 shadow-lg shadow-primary/20 light:shadow-md light:shadow-black/8"
            onClick={onCreate}
          >
            <Sparkles className="size-4" />
            Create campaign
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3 sm:gap-4">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <div
              key={title}
              className="relative rounded-xl border border-border/80 bg-background/60 p-4 text-left backdrop-blur-sm light:bg-surface-raised/50 light:border-border/70"
            >
              <span className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-4" />
              </span>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step {index + 1}
              </p>
              <p className="mt-1 font-medium text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-2">
          {PLATFORMS.map((platform) => (
            <span
              key={platform}
              className="rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm light:bg-surface light:border-border/80 light:shadow-none"
            >
              {PLATFORM_SPECS[platform].label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformBadges({ snapshot }: { snapshot: DashboardCampaignSnapshot }) {
  return (
    <div className="flex items-center gap-1">
      {PLATFORMS.map((platform) => {
        const entry = snapshot.entries.find((e) => e.platform === platform);
        const label = platform === "instagram" ? "IG" : platform === "linkedin" ? "LI" : "X";
        return (
          <span
            key={platform}
            title={PLATFORM_SPECS[platform].label}
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              entry?.status === "published"
                ? "bg-status-published/15 text-status-published ring-status-published/30"
                : entry?.status === "failed"
                  ? "bg-status-failed/15 text-status-failed ring-status-failed/30"
                  : entry?.status === "publishing"
                    ? "bg-status-publishing/15 text-status-publishing ring-status-publishing/30"
                    : "bg-muted/80 text-foreground ring-border/60",
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function CampaignRow({
  snapshot,
  selected,
  onSelect,
}: {
  snapshot: DashboardCampaignSnapshot;
  selected: boolean;
  onSelect: () => void;
}) {
  const thumbnail = pickThumbnail(snapshot);
  const variantCount = snapshot.entries.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-4 border-b border-border/50 px-4 py-3.5 text-left transition-all last:border-b-0 sm:px-5",
        selected
          ? "border-l-[3px] border-l-primary bg-primary/[0.07] pl-[calc(1rem-3px)] sm:pl-[calc(1.25rem-3px)] light:bg-surface-raised/60 light:border-l-primary/80"
          : "border-l-[3px] border-l-transparent hover:bg-accent/40 light:hover:bg-surface-raised/35",
      )}
    >
      <div
        className={cn(
          "relative size-14 shrink-0 overflow-hidden rounded-lg border shadow-sm",
          selected ? "border-primary/30 ring-2 ring-primary/20" : "border-border bg-muted",
        )}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/30">
            <Layers className="size-5 text-primary/70" />
          </div>
        )}
        <span className="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 py-px text-[9px] font-medium text-foreground shadow-sm">
          {variantCount}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">
            {snapshot.campaign.name}
          </p>
          <StatusChip status={snapshot.campaign.status} kind="campaign" className="shrink-0" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {snapshot.post.url ?? `Source: ${snapshot.post.source}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PlatformBadges snapshot={snapshot} />
          <span className="text-[11px] text-muted-foreground">
            {platformSummary(snapshot.entries)} · {formatRelative(snapshot.campaign.createdAt)}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span
          className={cn(
            "text-xs font-medium transition-colors",
            selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {selected ? "Open" : "View & publish"}
        </span>
        <ChevronRight
          className={cn(
            "size-4 transition-transform",
            selected ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground",
          )}
        />
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground sm:hidden" />
    </button>
  );
}

export function CampaignList({
  campaigns,
  selectedId,
  onSelect,
  onCreate,
}: {
  campaigns: DashboardCampaignSnapshot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  if (campaigns.length === 0) {
    return <CampaignEmptyState onCreate={onCreate} />;
  }

  const showHint = selectedId === null;

  return (
    <div className="space-y-4">
      {showHint ? (
        <div className="dashboard-hint flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 light:border-border/80 light:bg-surface-raised/70">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary light:bg-surface light:text-foreground/70">
              <CalendarClock className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Select a campaign to review variants
              </p>
              <p className="text-xs text-muted-foreground">
                Open a row to preview Instagram, X and LinkedIn posts — then publish or schedule.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-primary/30 bg-background/80 hover:bg-background light:border-border light:bg-surface"
            onClick={() => onSelect(campaigns[0]!.campaign.id)}
          >
            Open latest
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
        </div>
      ) : null}

      <section className="dashboard-panel overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-raised/30 px-4 py-4 sm:px-5 light:border-border/70 light:bg-surface-raised/40">
          <div>
            <h1 className="font-display text-xl text-foreground">Your campaigns</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} ready to review
            </p>
          </div>
          <Button size="sm" className="gap-1.5 shadow-sm" onClick={onCreate}>
            <Sparkles className="size-3.5" />
            <span className="hidden sm:inline">New campaign</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <div role="list">
          {campaigns.map((snapshot) => (
            <CampaignRow
              key={snapshot.campaign.id}
              snapshot={snapshot}
              selected={selectedId === snapshot.campaign.id}
              onSelect={() => onSelect(snapshot.campaign.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
