import { ArrowRight, FileInput, Send, Sparkles } from "lucide-react";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { interpolate } from "@/i18n/dashboard/catalog";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { Button } from "@/components/ui/button";
import { PLATFORMS } from "@/domain/entities";

const STEP_ICONS = [FileInput, Sparkles, Send] as const;

export function CampaignsStartView({
  onCreate,
  onOpenLibrary,
  campaignCount,
}: {
  onCreate: () => void;
  onOpenLibrary?: () => void;
  campaignCount: number;
}) {
  const { t } = useDashboardI18n();

  return (
    <div className="space-y-5">
      {campaignCount > 0 ? (
        <section className="dashboard-hint flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-medium text-foreground">
              {interpolate(
                campaignCount === 1 ? t.campaigns.libraryHintOne : t.campaigns.libraryHintMany,
                { count: campaignCount },
              )}
            </p>
            <p className="text-xs text-muted-foreground">{t.campaigns.libraryHintBody}</p>
          </div>
          {onOpenLibrary ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenLibrary}
              className="shrink-0 gap-1.5"
            >
              {t.campaigns.goToLibrary}
              <ArrowRight className="size-3.5" />
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className="dashboard-panel dashboard-empty-glow relative overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-[0_24px_60px_-24px_oklch(0.4_0.08_35_/_0.25)] light:border-border/80 light:shadow-none">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-16 -top-16 size-56 rounded-full bg-primary/15 blur-3xl light:bg-primary/8" />
          <div className="absolute -bottom-12 -right-12 size-48 rounded-full bg-status-published/10 blur-3xl light:bg-status-published/6" />
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary light:border-border light:bg-surface-raised/80 light:text-foreground/80">
              <Sparkles className="size-3.5" />
              {t.campaigns.badge}
            </div>

            <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
              {t.campaigns.title}
              <span className="text-primary">{t.campaigns.titleAccent}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t.campaigns.body}
            </p>

            <Button
              size="lg"
              className="mt-8 gap-2 px-8 shadow-lg shadow-primary/20 light:shadow-md light:shadow-black/8"
              onClick={onCreate}
            >
              <Sparkles className="size-4" />
              {t.campaigns.create}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3 sm:gap-4">
            {t.campaigns.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? Sparkles;
              return (
                <div
                  key={step.title}
                  className="relative rounded-xl border border-border/80 bg-background/60 p-4 text-left backdrop-blur-sm light:bg-surface-raised/50 light:border-border/70"
                >
                  <span className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {interpolate(t.campaigns.step, { n: index + 1 })}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              );
            })}
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
    </div>
  );
}
