import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthI18nProvider, useAuthI18n } from "@/i18n/auth/context";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { supabase } from "@/integrations/supabase/client";
import { signUpAccount } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPanelFan } from "@/components/auth/AuthPanelFan";
import { cn } from "@/lib/utils";

const THEME_KEY = "campaignhub-landing-theme";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("signin" as const),
    next:
      typeof search["next"] === "string" &&
      search["next"].startsWith("/") &&
      !search["next"].startsWith("//")
        ? search["next"]
        : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Sign in · CampaignHub" },
      {
        name: "description",
        content:
          "Sign in to CampaignHub to turn blog posts into scheduled, platform-native social campaigns.",
      },
      { property: "og:title", content: "Sign in · CampaignHub" },
      {
        property: "og:description",
        content: "Access your CampaignHub campaigns, image variants and delivery logs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: searchMode, next } = Route.useSearch();
  const [mode, setMode] = useState(searchMode);

  useEffect(() => {
    setMode(searchMode);
  }, [searchMode]);

  return (
    <AuthI18nProvider mode={mode}>
      <AuthPageContent mode={mode} onModeChange={setMode} next={next} />
    </AuthI18nProvider>
  );
}

function AuthPageContent({
  mode,
  onModeChange,
  next,
}: {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  next?: string;
}) {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useAuthI18n();
  const [dark, setDark] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem(THEME_KEY) === "dark");
  }, []);

  function toggleTheme() {
    setDark((current) => {
      const nextTheme = !current;
      localStorage.setItem(THEME_KEY, nextTheme ? "dark" : "light");
      return nextTheme;
    });
  }

  function afterAuth() {
    if (next) {
      window.location.replace(next);
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await signUpAccount({ data: { email, password } });

        if (!result.ok && result.needsClientSignup) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) {
            throw new Error(t.errors.confirmEmail);
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      afterAuth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.errors.authFailed);
    } finally {
      setBusy(false);
    }
  }

  const isSignIn = mode === "signin";

  return (
    <div className={cn("landing-page min-h-screen bg-background", dark && "landing-dark")}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <section
          className="relative hidden flex-col justify-between overflow-x-hidden overflow-y-visible border-r border-border bg-surface/50 p-10 xl:p-12 lg:flex"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="social-orb social-orb-coral absolute -left-20 top-12 size-72 rounded-full blur-3xl opacity-40" />
            <div className="social-orb social-orb-violet absolute -right-12 top-1/3 size-64 rounded-full blur-3xl opacity-35" />
            <div
              className="absolute bottom-0 left-1/4 size-56 rounded-full bg-primary/20 blur-3xl opacity-30"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent"
            />
          </div>

          <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center px-4 py-8 text-center">
            <div className="w-full max-w-lg space-y-6">
              <Link to="/" className="inline-flex items-center justify-center">
                <span className="font-display text-2xl font-bold tracking-[-0.04em]">
                  <span className="text-foreground">Campaign</span>
                  <span className="text-primary">Hub</span>
                </span>
              </Link>

              <div className="space-y-4">
                <h1 className="font-display text-[2.75rem] leading-[1.08] tracking-[-0.03em] text-foreground xl:text-5xl">
                  {t.panel.title}
                  <span className="block text-primary">{t.panel.titleAccent}</span>
                </h1>
                <p className="mx-auto max-w-sm text-base leading-relaxed text-muted-foreground">
                  {t.panel.body}
                </p>
              </div>

              <AuthPanelFan posts={t.panel.posts} />
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between gap-4 px-6 py-5 lg:px-10">
            <Link to="/" className="inline-flex items-center lg:hidden">
              <span className="font-display text-xl font-bold tracking-[-0.04em]">
                <span className="text-foreground">Campaign</span>
                <span className="text-primary">Hub</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 lg:ml-auto">
              <LocaleToggle
                locale={locale}
                setLocale={setLocale}
                chooseLanguageLabel={t.chooseLanguage}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
                onClick={toggleTheme}
                aria-label={dark ? t.switchToLight : t.switchToDark}
              >
                {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-10 lg:px-10">
            <div className="w-full max-w-sm space-y-6">
              <header className="space-y-1">
                <h2 className="font-display text-2xl text-foreground">
                  {isSignIn ? t.form.signInTitle : t.form.signUpTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSignIn ? t.form.signInSubtitle : t.form.signUpSubtitle}
                </p>
              </header>

              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.form.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.form.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isSignIn ? "current-password" : "new-password"}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? t.form.busy
                    : isSignIn
                      ? t.form.signInSubmit
                      : t.form.signUpSubmit}
                </Button>
              </form>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => {
                  const nextMode = isSignIn ? "signup" : "signin";
                  onModeChange(nextMode);
                  void navigate({
                    to: "/auth",
                    search: { mode: nextMode, next },
                    replace: true,
                  });
                }}
              >
                {isSignIn ? t.form.switchToSignUp : t.form.switchToSignIn}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
