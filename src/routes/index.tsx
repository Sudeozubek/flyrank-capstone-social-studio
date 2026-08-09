import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  FileInput,
  Languages,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";
import { HeroGeneration } from "@/components/landing/HeroGeneration";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingI18nProvider, landingEn, useLandingI18n } from "@/i18n";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Button } from "@/components/ui/button";

const FEATURE_ICONS = [Layers, ShieldCheck, CalendarClock, Webhook];
const STEP_ICONS = [FileInput, Sparkles, ArrowRight];
const BENEFIT_ICONS = [Clock3, Palette, Languages];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: landingEn.meta.title },
      { name: "description", content: landingEn.meta.description },
      { property: "og:title", content: landingEn.meta.ogTitle },
      { property: "og:description", content: landingEn.meta.ogDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function LandingPage({ dark, onThemeToggle }: { dark: boolean; onThemeToggle: () => void }) {
  const { t } = useLandingI18n();

  return (
    <div
      className={`landing-page min-h-screen overflow-hidden bg-background ${dark ? "landing-dark" : ""}`}
    >
      <LandingHeader dark={dark} onThemeToggle={onThemeToggle} />
      <main>
        <section className="landing-sky relative">
          <div
            className="landing-grid absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="sky-cloud sky-cloud-1 absolute" />
            <div className="sky-cloud sky-cloud-2 absolute" />
            <div className="sky-cloud sky-cloud-3 absolute" />
            <div className="sky-cloud sky-cloud-4 absolute" />
            <div className="sky-cloud sky-cloud-5 absolute" />
            <div className="sky-cloud sky-cloud-6 absolute" />

            <div className="social-orb social-orb-coral absolute -left-32 top-24 size-80 rounded-full blur-3xl" />
            <div className="social-orb social-orb-violet absolute -right-28 top-10 size-96 rounded-full blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-20 lg:pb-24 lg:pt-24">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface/70 px-3 py-1.5 text-xs text-primary shadow-sm backdrop-blur-sm">
                  <Sparkles className="size-3.5" />
                  {t.hero.badge}
                </div>
                <h1 className="mt-7 text-balance font-display text-5xl leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.1rem]">
                  {t.hero.title}
                  <span className="block text-primary">{t.hero.titleAccent}</span>
                </h1>
                <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {t.hero.body}
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl px-6 shadow-lg shadow-primary/15 sm:w-auto"
                    asChild
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {t.hero.ctaPrimary}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-xl border-border bg-background px-6 text-foreground shadow-sm backdrop-blur-sm hover:bg-background/90 sm:w-auto"
                    asChild
                  >
                    <a href="#how-it-works">{t.hero.ctaSecondary}</a>
                  </Button>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {t.hero.trustItems.map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-status-published" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <HeroGeneration />
            </div>

            <div className="mt-20 sm:mt-24">
              <HeroVisual />
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-surface/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-border/70 px-6 sm:grid-cols-4 sm:divide-y-0">
            {t.stats.map((stat, index) => (
              <ScrollReveal
                key={stat.value}
                as="div"
                delay={index * 90}
                className="px-4 py-7 text-center sm:px-6"
              >
                <p className="font-display text-xl text-foreground sm:text-2xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="border-b border-border/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:py-24">
            <ScrollReveal>
              <p className="eyebrow">{t.benefits.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                {t.benefits.title}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                {t.benefits.body}
              </p>
            </ScrollReveal>
            <div className="grid gap-3">
              {t.benefits.items.map((benefit, index) => {
                const Icon = BENEFIT_ICONS[index]!;
                return (
                  <ScrollReveal key={benefit.title} delay={index * 120}>
                    <article className="group flex gap-4 rounded-2xl border border-border bg-surface/60 p-5 transition-[border-color,transform] duration-300 hover:translate-x-1 hover:border-primary/25">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{benefit.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {benefit.body}
                        </p>
                      </div>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">{t.workflow.eyebrow}</p>
              <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                {t.workflow.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {t.workflow.body}
              </p>
            </ScrollReveal>
            <ol className="mt-14 grid gap-5 sm:grid-cols-3">
              {t.workflow.steps.map((item, index) => {
                const Icon = STEP_ICONS[index]!;
                return (
                  <ScrollReveal
                    key={item.step}
                    as="li"
                    delay={index * 140}
                    className="group rounded-2xl border border-border bg-surface/70 p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-primary/35"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-muted-foreground/70">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-xl text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </ScrollReveal>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <ScrollReveal className="lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow">{t.features.eyebrow}</p>
                <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                  {t.features.title}
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  {t.features.body}
                </p>
                <div className="mt-7 flex items-center gap-3 rounded-xl border border-status-published/20 bg-status-published/5 p-4">
                  <BadgeCheck className="size-5 shrink-0 text-status-published" />
                  <p className="text-sm text-foreground/80">{t.features.deliveryNote}</p>
                </div>
              </ScrollReveal>
              <div className="grid gap-4 sm:grid-cols-2">
                {t.features.items.map((feature, index) => {
                  const Icon = FEATURE_ICONS[index]!;
                  return (
                    <ScrollReveal key={feature.title} delay={index * 100}>
                      <article className="group rounded-2xl border border-border bg-background/50 p-6 transition-colors hover:border-primary/30">
                        <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary">
                          <Icon className="size-5" />
                        </div>
                        <h3 className="mt-4 font-display text-xl text-foreground">
                          {feature.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {feature.body}
                        </p>
                        <p className="mt-5 border-t border-border/70 pt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {feature.detail}
                        </p>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-surface px-6 py-12 text-center shadow-2xl shadow-black/10 sm:px-12 sm:py-16">
                <div
                  className="absolute inset-x-[25%] -top-24 h-48 rounded-full bg-primary/15 blur-[80px]"
                  aria-hidden
                />
                <div className="relative">
                  <p className="eyebrow">{t.cta.eyebrow}</p>
                  <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl text-foreground sm:text-4xl">
                    {t.cta.title}
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t.cta.body}
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Button size="lg" className="h-12 rounded-xl px-6" asChild>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        {t.cta.primary}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 rounded-xl border-border bg-background px-6 text-foreground shadow-sm hover:bg-background/90"
                      asChild
                    >
                      <Link to="/auth" search={{ mode: "signin" }}>
                        {t.cta.secondary}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <ScrollReveal>
        <LandingFooter />
      </ScrollReveal>
    </div>
  );
}

function Landing() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("campaignhub-landing-theme") === "dark");
  }, []);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      localStorage.setItem("campaignhub-landing-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <LandingI18nProvider>
      <LandingPage dark={dark} onThemeToggle={toggleTheme} />
    </LandingI18nProvider>
  );
}
