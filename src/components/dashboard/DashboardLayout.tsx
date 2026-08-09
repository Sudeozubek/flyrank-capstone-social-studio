import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Activity, ChevronRight, LayoutGrid, Library, LogOut, Plus, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DashboardView } from "@/components/dashboard/types";
import { DashboardProfileSheet } from "@/components/dashboard/DashboardProfileSheet";
import { DashboardLocaleToggle } from "@/i18n/dashboard/LocaleToggle";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { AiSpendBadge } from "@/components/campaign/AiSpendBadge";
import { ThemeToggle } from "@/components/campaign/ThemeToggle";
import type { AiSpendSnapshot } from "@/domain/ai-spend";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "campaignhub-sidebar-collapsed";
const MOBILE_NAV_MQ = "(max-width: 1023px)";

function useMobileNavLayout() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_NAV_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function profileInitials(email: string | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
}

export function DashboardLayout({
  view,
  onViewChange,
  aiSpend,
  live,
  user,
  onNewCampaign,
  onSignOut,
  children,
}: {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  aiSpend?: AiSpendSnapshot | null | undefined;
  live?: boolean;
  user: User | null;
  onNewCampaign: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const { t } = useDashboardI18n();
  const isMobileNav = useMobileNavLayout();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);
  const email = user?.email ?? "";

  const nav = useMemo(
    () =>
      [
        { id: "campaigns" as const, label: t.layout.campaigns, icon: LayoutGrid },
        { id: "library" as const, label: t.layout.library, icon: Library },
        { id: "activity" as const, label: t.layout.activity, icon: Activity },
      ] satisfies Array<{ id: DashboardView; label: string; icon: typeof LayoutGrid }>,
    [t],
  );

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    const node = mainScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  function selectView(next: DashboardView) {
    setProfileOpen(false);
    onViewChange(next);
  }

  const sidebarToggleLabel = collapsed ? t.layout.expandSidebar : t.layout.collapseSidebar;

  const profileTrigger = (
    <button
      type="button"
      onClick={() => setProfileOpen(true)}
      className={cn(
        "flex w-full items-center rounded-lg border border-border/60 bg-surface-raised/50 text-left transition-colors hover:bg-accent/40",
        collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
      )}
      title={collapsed ? t.layout.profile : undefined}
    >
      <Avatar className={cn("shrink-0 border border-border/50", collapsed ? "size-8" : "size-9")}>
        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
          {profileInitials(email)}
        </AvatarFallback>
      </Avatar>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {t.layout.profile}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {email || t.layout.account}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </>
      ) : null}
    </button>
  );

  const chromeControls = (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5",
        collapsed ? "flex-col" : "justify-between px-1",
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-1", collapsed ? "w-full flex-col" : "")}>
        <DashboardLocaleToggle compact={collapsed} />
        <ThemeToggle lightLabel={t.theme.switchToLight} darkLabel={t.theme.switchToDark} />
      </div>
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "sm"}
        className={cn("text-muted-foreground", collapsed ? "size-8" : "h-8 gap-1.5")}
        onClick={onSignOut}
        title={collapsed ? t.layout.signOut : undefined}
      >
        <LogOut className="size-3.5" />
        {!collapsed ? t.layout.signOut : null}
      </Button>
    </div>
  );

  return (
    <div
      className="dashboard-shell relative flex h-screen overflow-hidden"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      <aside
        className={cn(
          "dashboard-chrome relative z-30 hidden h-full shrink-0 flex-col overflow-x-hidden border-r border-border/60 lg:flex",
          "w-[var(--dashboard-sidebar-width)]",
        )}
      >
        <button
          type="button"
          className="dashboard-sidebar-edge-right"
          onClick={toggleSidebar}
          aria-label={sidebarToggleLabel}
          title={sidebarToggleLabel}
        />

        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border/50",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          {!collapsed ? (
            <Link to="/" className="group inline-flex items-baseline gap-1.5">
              <span className="font-display text-base tracking-tight text-foreground transition-colors group-hover:text-primary">
                {t.layout.brandCampaign}
              </span>
              <span className="font-display text-base tracking-tight text-primary">
                {t.layout.brandHub}
              </span>
            </Link>
          ) : (
            <Link
              to="/"
              className="font-display text-sm font-semibold text-primary"
              title={t.layout.brandTitle}
            >
              {t.layout.brandShort}
            </Link>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectView(id)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex w-full items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2",
                view === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed ? label : null}
            </button>
          ))}

          <div className={cn("mt-3", collapsed ? "px-1" : "px-1")}>
            <Button
              onClick={onNewCampaign}
              className={cn("gap-2", collapsed ? "size-9 px-0" : "w-full justify-start")}
              size="sm"
              title={collapsed ? t.layout.newCampaign : undefined}
            >
              <Plus className="size-4 shrink-0" />
              {!collapsed ? t.layout.newCampaign : null}
            </Button>
          </div>
        </nav>

        <div className="min-w-0 shrink-0 space-y-2 overflow-hidden border-t border-border/50 p-2">
          {profileTrigger}
          {chromeControls}
        </div>
      </aside>

      <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="dashboard-top-bar dashboard-grid-bg shrink-0">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <Link to="/" className="font-display text-base text-foreground lg:hidden">
              {t.layout.brandCampaign}
              <span className="text-primary">{t.layout.brandHub}</span>
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {live ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-published opacity-40" />
                    <span className="relative inline-flex size-2 rounded-full bg-status-published" />
                  </span>
                  <span className="hidden sm:inline">{t.layout.live}</span>
                </span>
              ) : null}
              {aiSpend ? <AiSpendBadge spend={aiSpend} /> : null}
              <Button
                size="icon"
                className="size-9 shrink-0 lg:hidden"
                onClick={onNewCampaign}
                aria-label={t.layout.newCampaign}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main
          ref={mainScrollRef}
          className="dashboard-grid-bg dashboard-main-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="dashboard-main-frame">
            <div className="dashboard-main-body mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:py-8">
              {children}
            </div>

            <footer className="dashboard-main-footer">
              <div className="dashboard-main-footer-inner">
                <span>{t.layout.footerRights}</span>
                <span className="hidden sm:inline">{t.layout.footerVersion}</span>
              </div>
            </footer>
          </div>
        </main>

        <nav
          className="dashboard-mobile-nav dashboard-chrome lg:hidden"
          aria-label="Dashboard navigation"
        >
          {nav.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectView(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "dashboard-mobile-nav-item",
                  active && "dashboard-mobile-nav-item-active",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                <span className="dashboard-mobile-nav-label">{label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className={cn(
              "dashboard-mobile-nav-item",
              profileOpen && "dashboard-mobile-nav-item-active",
            )}
            aria-label={t.layout.openProfile}
          >
            <UserRound className="size-5 shrink-0" />
            <span className="dashboard-mobile-nav-label">{t.layout.profile}</span>
          </button>
        </nav>
      </div>

      <DashboardProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        onSignOut={onSignOut}
        showPreferences={isMobileNav}
      />
    </div>
  );
}
