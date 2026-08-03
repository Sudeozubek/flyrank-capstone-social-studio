import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signUpAccount } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search['mode'] === "signup" ? ("signup" as const) : ("signin" as const),
    // Same-origin relative path to return to after sign-in (used by the MCP
    // OAuth consent flow so the authorization survives the login round-trip).
    next:
      typeof search['next'] === "string" && search['next'].startsWith("/") && !search['next'].startsWith("//")
        ? search['next']
        : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Sign in · CampaignHub Studio" },
      {
        name: "description",
        content:
          "Sign in to CampaignHub to turn blog posts into scheduled, platform-native social campaigns.",
      },
      { property: "og:title", content: "Sign in · CampaignHub Studio" },
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
  const navigate = useNavigate();
  const { mode: initialMode, next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
            throw new Error(
              "Hesap oluşturuldu ama oturum açılamadı. Supabase Dashboard → Authentication → Sign In / Providers → Email → «Confirm email» seçeneğini kapatın, sonra tekrar kayıt olun.",
            );
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
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const returnTo = next ? window.location.origin + next : window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnTo },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
    }
  }


  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <div className="font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground">
          CampaignHub
        </div>
        <div className="max-w-md space-y-5">
          <h1 className="font-display text-4xl leading-tight text-foreground">
            One blog post. Every platform. Published on schedule.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            CampaignHub turns a published article into platform-native captions and correctly
            framed image variants, then publishes them through a durable, idempotent,
            webhook-confirmed pipeline.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-xs text-muted-foreground">
          <div>
            <dt className="text-foreground">Idempotent</dt>
            <dd>No duplicate posts on retry</dd>
          </div>
          <div>
            <dt className="text-foreground">Durable</dt>
            <dd>Lease-based crash recovery</dd>
          </div>
          <div>
            <dt className="text-foreground">Signed</dt>
            <dd>HMAC delivery webhooks</dd>
          </div>
        </dl>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <header className="space-y-1">
            <h2 className="font-display text-2xl text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your workspace"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to continue to your campaigns."
                : "Start turning posts into campaigns in under a minute."}
            </p>
          </header>

          <Button variant="outline" className="w-full" onClick={google} type="button">
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
