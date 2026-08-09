import { Activity, ChevronDown, Radio, ShieldCheck, ShieldX, Wrench, Zap } from "lucide-react";
import { AiSpendPanel } from "@/components/campaign/AiSpendPanel";
import type { AiSpendSnapshot } from "@/domain/ai-spend";
import { formatAiUsd } from "@/domain/ai-spend";
import { PLATFORMS } from "@/domain/entities";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { interpolate } from "@/i18n/dashboard/catalog";
import { useDashboardI18n } from "@/i18n/dashboard/context";

type WebhookEvent = {
  id: string;
  signatureValid: boolean;
  httpStatus: number;
  message: string | null;
  receivedAt: string;
};

function formatEventTime(iso: string, locale: "en" | "tr"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActivityStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="dashboard-activity-stat rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "success" && "text-status-published",
            tone === "danger" && "text-status-failed",
            tone === "default" && "text-muted-foreground",
          )}
        />
      </div>
      <p className="mt-1 font-display text-xl text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ActivityView({
  aiSpend,
  webhooks,
  busy,
  scheduleAt,
  onScheduleAtChange,
  onTick,
  onRateLimit,
}: {
  aiSpend: AiSpendSnapshot | null | undefined;
  webhooks: WebhookEvent[];
  busy: boolean;
  scheduleAt: string;
  onScheduleAtChange: (value: string) => void;
  onTick: () => void;
  onRateLimit: (platform: (typeof PLATFORMS)[number]) => void;
}) {
  const { t, locale } = useDashboardI18n();
  const a = t.activity;
  const signedCount = webhooks.filter((e) => e.signatureValid).length;
  const rejectedCount = webhooks.length - signedCount;

  return (
    <div className="space-y-5">
      <section className="dashboard-panel rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-xl text-foreground">{a.title}</h1>
            <p className="mt-1 text-sm text-foreground/75">{a.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ActivityStat
            label={a.aiBudget}
            value={aiSpend ? `${aiSpend.percentUsed.toFixed(0)}%` : a.noData}
            hint={
              aiSpend
                ? interpolate(a.budgetHint, {
                    spend: formatAiUsd(aiSpend.spendUsd),
                    budget: formatAiUsd(aiSpend.budgetUsd),
                  })
                : a.noSession
            }
            icon={Zap}
            tone={
              aiSpend?.status === "critical" || aiSpend?.status === "exhausted"
                ? "danger"
                : "default"
            }
          />
          <ActivityStat
            label={a.signed}
            value={String(signedCount)}
            hint={webhooks.length ? a.signedHint : a.signedEmpty}
            icon={ShieldCheck}
            tone="success"
          />
          <ActivityStat
            label={a.rejected}
            value={String(rejectedCount)}
            hint={rejectedCount ? a.rejectedHint : a.rejectedEmpty}
            icon={ShieldX}
            tone={rejectedCount > 0 ? "danger" : "default"}
          />
        </div>
      </section>

      {aiSpend ? (
        <section className="dashboard-panel overflow-hidden rounded-2xl border border-border">
          <AiSpendPanel spend={aiSpend} compact embedded labels={t.aiSpend} />
        </section>
      ) : null}

      <DeliveryTimeline webhooks={webhooks} />

      <DeveloperTools
        busy={busy}
        scheduleAt={scheduleAt}
        onScheduleAtChange={onScheduleAtChange}
        onTick={onTick}
        onRateLimit={onRateLimit}
      />
    </div>
  );
}

export function DeveloperTools({
  busy,
  scheduleAt,
  onScheduleAtChange,
  onTick,
  onRateLimit,
}: {
  busy: boolean;
  scheduleAt: string;
  onScheduleAtChange: (value: string) => void;
  onTick: () => void;
  onRateLimit: (platform: (typeof PLATFORMS)[number]) => void;
}) {
  const { t } = useDashboardI18n();
  const a = t.activity;

  return (
    <Collapsible>
      <section className="dashboard-panel overflow-hidden rounded-2xl border border-border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/20 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Wrench className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{a.devTools}</p>
              <p className="text-xs text-foreground/65">{a.devToolsBody}</p>
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="dashboard-activity-inset mx-4 mb-4 space-y-4 rounded-xl p-4 sm:mx-5 sm:mb-5">
            <div className="space-y-2">
              <Label htmlFor="dev-schedule-at" className="text-xs font-medium text-foreground/80">
                {a.defaultSchedule}
              </Label>
              <Input
                id="dev-schedule-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => onScheduleAtChange(e.target.value)}
                className="h-9 bg-background text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onTick}
              className="w-full sm:w-auto"
            >
              {a.runTick}
            </Button>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground/80">{a.simulateRateLimits}</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <Button
                    key={platform}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    className="bg-background text-xs"
                    onClick={() => onRateLimit(platform)}
                  >
                    {interpolate(a.rateLimitButton, { platform: PLATFORM_SPECS[platform].label })}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function DeliveryTimeline({
  webhooks,
  className,
}: {
  webhooks: WebhookEvent[];
  className?: string;
}) {
  const { t, locale } = useDashboardI18n();
  const a = t.activity;

  return (
    <section
      className={cn("dashboard-panel overflow-hidden rounded-2xl border border-border", className)}
    >
      <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <Radio className="size-3.5" />
          </span>
          <div>
            <h2 className="font-display text-base text-foreground">{a.deliveryLog}</h2>
            <p className="text-xs text-foreground/65">{a.deliveryLogBody}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-activity-inset m-4 rounded-xl p-2 sm:m-5">
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
          {webhooks.length === 0 ? (
            <li className="dashboard-activity-row rounded-lg px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">{a.noEventsTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.noEventsBody}</p>
            </li>
          ) : (
            webhooks.map((event) => (
              <li
                key={event.id}
                className="dashboard-activity-row flex items-start gap-3 rounded-lg px-3 py-3 sm:px-4"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    event.signatureValid
                      ? "bg-status-published/15 text-status-published"
                      : "bg-status-failed/15 text-status-failed",
                  )}
                >
                  {event.signatureValid ? (
                    <ShieldCheck className="size-3.5" />
                  ) : (
                    <ShieldX className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        event.signatureValid ? "text-status-published" : "text-status-failed",
                      )}
                    >
                      {event.signatureValid ? a.signedEvent : a.rejectedEvent}
                    </span>
                    <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
                      HTTP {event.httpStatus}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                    {event.message ?? a.noMessage}
                  </p>
                </div>
                <time className="shrink-0 text-right text-[11px] leading-tight tabular-nums text-muted-foreground">
                  {formatEventTime(event.receivedAt, locale)}
                </time>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
