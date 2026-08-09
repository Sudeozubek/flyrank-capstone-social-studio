import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Search, Sparkles } from "lucide-react";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { CampaignActionBar } from "@/components/dashboard/CampaignActionBar";
import { LibraryVariantCard, LIBRARY_VARIANT_CARD_HEIGHT } from "@/components/dashboard/LibraryVariantCard";
import { CampaignEditDialog, type CampaignEdit } from "@/components/campaign/CampaignEditDialog";
import { StatusChip } from "@/components/campaign/StatusChip";
import type { DashboardCampaignSnapshot } from "@/components/dashboard/types";
import {
  entriesForFilter,
  filterCampaigns,
  type PlatformFilter,
} from "@/components/dashboard/campaign-library-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS } from "@/domain/entities";
import { interpolate } from "@/i18n/dashboard/catalog";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { cn } from "@/lib/utils";

function formatRelative(iso: string, locale: "en" | "tr", time: { justNow: string; minutesAgo: string; hoursAgo: string }): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return time.justNow;
  if (mins < 60) return interpolate(time.minutesAgo, { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return interpolate(time.hoursAgo, { hours });
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short" });
}

export function CampaignLibraryView({
  campaigns,
  expandedCampaignId,
  onExpandCampaign,
  scheduleAt,
  onScheduleAtChange,
  busy,
  editingId,
  onEditOpen,
  onEditClose,
  onSaveEdit,
  onPublish,
  onSchedule,
  onRegenerateCaptions,
  onRegenerateImages,
  onRetry,
  onDelete,
  onCreate,
  loading,
}: {
  campaigns: DashboardCampaignSnapshot[];
  expandedCampaignId: string | null;
  onExpandCampaign: (id: string | null) => void;
  scheduleAt: string;
  onScheduleAtChange: (value: string) => void;
  busy: boolean;
  editingId: string | null;
  onEditOpen: (campaignId: string) => void;
  onEditClose: () => void;
  onSaveEdit: (edit: CampaignEdit) => Promise<void>;
  onPublish: (campaignId: string) => void;
  onSchedule: (campaignId: string) => void;
  onRegenerateCaptions: (campaignId: string) => void;
  onRegenerateImages: (campaignId: string) => void;
  onRetry: (campaignId: string) => void;
  onDelete: (campaignId: string, name: string) => void;
  onCreate: () => void;
  loading?: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const filtered = useMemo(
    () => filterCampaigns(campaigns, query, platform),
    [campaigns, query, platform],
  );

  const editingSnapshot = useMemo(
    () => campaigns.find((c) => c.campaign.id === editingId) ?? null,
    [campaigns, editingId],
  );

  useEffect(() => {
    if (!expandedCampaignId) return;
    const node = sectionRefs.current[expandedCampaignId];
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [expandedCampaignId, filtered.length]);

  if (loading) {
    return (
      <section className="dashboard-panel space-y-4 rounded-2xl border border-border p-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn("animate-pulse rounded-xl bg-muted/60", LIBRARY_VARIANT_CARD_HEIGHT)}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="dashboard-panel rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-xl text-foreground">{t.library.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.library.subtitle}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.library.searchPlaceholder}
                className="pl-9"
                aria-label={t.library.searchAria}
              />
            </div>
            <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformFilter)}>
              <SelectTrigger className="w-full sm:w-[11rem]" aria-label={t.library.filterAria}>
                <SelectValue placeholder={t.library.allPlatforms} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.library.allPlatforms}</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_SPECS[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={onCreate}>
              <Sparkles className="size-3.5" />
              {t.library.new}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {interpolate(filtered.length === 1 ? t.library.countOne : t.library.countMany, {
            count: filtered.length,
          })}
          {platform !== "all"
            ? interpolate(t.library.platformVariants, { platform: PLATFORM_SPECS[platform].label })
            : ""}
        </p>
      </section>

      {campaigns.length === 0 ? (
        <section className="dashboard-panel flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <LayoutGrid className="mb-3 size-10 text-muted-foreground/60" />
          <h2 className="font-display text-lg text-foreground">{t.library.emptyTitle}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t.library.emptyBody}</p>
          <Button className="mt-6 gap-2" onClick={onCreate}>
            <Sparkles className="size-4" />
            {t.library.emptyCta}
          </Button>
        </section>
      ) : filtered.length === 0 ? (
        <section className="dashboard-panel rounded-2xl border border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{t.library.noMatch}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setPlatform("all");
            }}
          >
            {t.library.clearFilters}
          </Button>
        </section>
      ) : (
        <div className="space-y-6">
          {filtered.map((snapshot) => {
            const id = snapshot.campaign.id;
            const variants = entriesForFilter(snapshot, platform);
            const expanded = expandedCampaignId === id;

            return (
              <article
                key={id}
                ref={(node) => {
                  sectionRefs.current[id] = node;
                }}
                className={cn(
                  "dashboard-panel scroll-mt-24 overflow-hidden rounded-2xl border transition-shadow",
                  expanded && "ring-2 ring-primary/25",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-surface-raised/30 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-base text-foreground sm:text-lg">
                        {snapshot.campaign.name}
                      </h2>
                      <StatusChip status={snapshot.campaign.status} kind="campaign" />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {snapshot.post.url ??
                        interpolate(t.library.sourcePrefix, { source: snapshot.post.source })}{" "}
                      · {formatRelative(snapshot.campaign.createdAt, locale, t.time)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={expanded ? "secondary" : "default"}
                    className="shrink-0 gap-1.5"
                    onClick={() => onExpandCampaign(expanded ? null : id)}
                  >
                    {expanded ? t.library.hideControls : t.library.manageCampaign}
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                    />
                  </Button>
                </header>

                <CampaignActionBar
                  busy={busy}
                  scheduleAt={scheduleAt}
                  expanded={expanded}
                  scheduleInputId={`schedule-at-${id}`}
                  onScheduleAtChange={onScheduleAtChange}
                  onPublish={() => onPublish(id)}
                  onSchedule={() => onSchedule(id)}
                  onRegenerateCaptions={() => onRegenerateCaptions(id)}
                  onRegenerateImages={() => onRegenerateImages(id)}
                  onRetry={() => onRetry(id)}
                  onEdit={() => onEditOpen(id)}
                  onDelete={() => onDelete(id, snapshot.campaign.name)}
                />

                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                  {variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.library.noVariants}</p>
                  ) : (
                    variants.map((entry) => (
                      <LibraryVariantCard
                        key={entry.id}
                        entry={entry}
                        imageUrl={snapshot.images[entry.platform] ?? null}
                      />
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editingSnapshot ? (
        <CampaignEditDialog
          snapshot={editingSnapshot}
          open={editingId === editingSnapshot.campaign.id}
          busy={busy}
          onOpenChange={(open) => (open ? onEditOpen(editingSnapshot.campaign.id) : onEditClose())}
          onSave={onSaveEdit}
        />
      ) : null}
    </div>
  );
}
