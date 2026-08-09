import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { KeyRound, Link2, LogOut, Mail, Unlink } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_SPECS } from "@/config/platform-specs";
import type { Platform } from "@/domain/entities";
import { PLATFORMS } from "@/domain/entities";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  readMockPlatformConnections,
  writeMockPlatformConnection,
  type MockPlatformConnections,
} from "@/components/dashboard/mock-platform-connections";
import { interpolate } from "@/i18n/dashboard/catalog";
import { DashboardLocaleToggle } from "@/i18n/dashboard/LocaleToggle";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { ThemeToggle } from "@/components/campaign/ThemeToggle";
import { cn } from "@/lib/utils";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
}

export function DashboardProfileSheet({
  open,
  onOpenChange,
  user,
  onSignOut,
  showPreferences = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSignOut?: () => void;
  /** Mobile: locale, theme, sign out in sheet footer */
  showPreferences?: boolean;
}) {
  const { t } = useDashboardI18n();
  const p = t.profile;
  const toastT = t.toasts;
  const layout = t.layout;
  const email = user?.email ?? "";
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [connections, setConnections] = useState<MockPlatformConnections>(() =>
    readMockPlatformConnections(),
  );

  useEffect(() => {
    if (open) {
      setConnections(readMockPlatformConnections());
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success(toastT.emailConfirmTitle, {
        description: toastT.emailConfirmBody,
      });
      setNewEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : toastT.emailUpdateFailed);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(toastT.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(toastT.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(toastT.passwordUpdated);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : toastT.passwordUpdateFailed);
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!email) {
      toast.error(toastT.noEmail);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success(toastT.resetSentTitle, {
        description: interpolate(toastT.resetSentBody, { email }),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : toastT.resetFailed);
    } finally {
      setBusy(false);
    }
  }

  function toggleMockConnection(platform: Platform) {
    const next = !connections[platform];
    writeMockPlatformConnection(platform, next);
    setConnections((current) => ({ ...current, [platform]: next }));
    toast.message(
      next
        ? interpolate(toastT.platformConnected, { platform: PLATFORM_SPECS[platform].label })
        : toastT.disconnected,
      {
        description: toastT.demoOAuth,
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="composer-modal-shell flex w-full flex-col border-border/80 bg-surface p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-center gap-3 pr-8">
            <Avatar className="size-11 border border-border/60">
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {email ? initialsFromEmail(email) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="font-display text-lg">{p.title}</SheetTitle>
              <SheetDescription className="truncate text-sm">{email || p.signedIn}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="account" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
              <Mail className="size-3.5" />
              {p.accountTab}
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5 text-xs sm:text-sm">
              <Link2 className="size-3.5" />
              {p.platformsTab}
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="account" className="mt-0 space-y-6">
              <section className="dashboard-activity-inset space-y-3 rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground">{p.changeEmail}</h3>
                <p className="text-xs text-muted-foreground">{p.changeEmailBody}</p>
                <form className="space-y-3" onSubmit={changeEmail}>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-new-email" className="text-xs">
                      {p.newEmail}
                    </Label>
                    <Input
                      id="profile-new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={email || p.emailPlaceholder}
                      className="h-9 bg-background"
                      autoComplete="email"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={busy || !newEmail.trim()}>
                    {p.updateEmail}
                  </Button>
                </form>
              </section>

              <section className="dashboard-activity-inset space-y-3 rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground">{p.changePassword}</h3>
                <form className="space-y-3" onSubmit={changePassword}>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-new-password" className="text-xs">
                      {p.newPassword}
                    </Label>
                    <Input
                      id="profile-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      className="h-9 bg-background"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-confirm-password" className="text-xs">
                      {p.confirmPassword}
                    </Label>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      className="h-9 bg-background"
                      autoComplete="new-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !newPassword || !confirmPassword}
                    className="gap-1.5"
                  >
                    <KeyRound className="size-3.5" />
                    {p.updatePassword}
                  </Button>
                </form>
              </section>

              <section className="dashboard-activity-inset space-y-3 rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground">{p.forgotPassword}</h3>
                <p className="text-xs text-muted-foreground">
                  {interpolate(p.forgotPasswordBody, { email })}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !email}
                  onClick={sendPasswordReset}
                  className="bg-background"
                >
                  {p.sendReset}
                </Button>
              </section>
            </TabsContent>

            <TabsContent value="platforms" className="mt-0 space-y-4">
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{p.demoNotice}</span> {p.demoNoticeBody}
              </div>

              <ul className="space-y-2">
                {PLATFORMS.map((platform) => {
                  const connected = connections[platform];
                  const spec = PLATFORM_SPECS[platform];
                  return (
                    <li
                      key={platform}
                      className="dashboard-activity-row flex items-center gap-3 rounded-xl px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{spec.label}</p>
                          {connected ? (
                            <Badge
                              variant="secondary"
                              className="h-5 bg-status-published/15 text-[10px] text-status-published"
                            >
                              {p.connected}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[10px]">
                              {p.notConnected}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {connected ? p.connectedHint : p.notConnectedHint}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={connected ? "outline" : "default"}
                        className={cn("shrink-0 gap-1.5", connected && "bg-background")}
                        onClick={() => toggleMockConnection(platform)}
                      >
                        {connected ? (
                          <>
                            <Unlink className="size-3.5" />
                            {p.disconnect}
                          </>
                        ) : (
                          <>
                            <Link2 className="size-3.5" />
                            {p.connect}
                          </>
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </TabsContent>
          </div>
        </Tabs>

        {showPreferences && onSignOut ? (
          <div className="dashboard-profile-preferences-footer shrink-0 border-t border-border/60 px-6 py-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {layout.preferences}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <DashboardLocaleToggle compact />
              <ThemeToggle lightLabel={t.theme.switchToLight} darkLabel={t.theme.switchToDark} />
              <Button
                variant="outline"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onSignOut();
                }}
              >
                <LogOut className="size-3.5" />
                {layout.signOut}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
