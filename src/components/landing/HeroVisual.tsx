import {
  ArrowDown,
  ArrowRight,
  Check,
  FileText,
  ImageIcon,
  Instagram,
  Languages,
  Linkedin,
  MessageSquareText,
  Palette,
  Sparkles,
} from "lucide-react";
import { useLandingI18n } from "@/i18n";

const OUTPUT_META = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    format: "1080 × 1080",
    color: "from-orange-300 via-rose-400 to-violet-500",
  },
  {
    id: "x",
    label: "X",
    format: "1600 × 900",
    color: "from-slate-200 via-sky-300 to-blue-500",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    format: "1200 × 627",
    color: "from-amber-200 via-orange-300 to-emerald-500",
  },
] as const;

export function HeroVisual() {
  const { locale, t } = useLandingI18n();
  const v = t.heroVisual;
  const outputLanguage = locale === "tr" ? v.languageTurkish : v.languageEnglish;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div
        className="absolute inset-x-[12%] -top-16 h-48 rounded-full bg-primary/15 blur-[100px]"
        aria-hidden
      />
      <div className="landing-studio landing-float relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[oklch(0.14_0.01_75)] shadow-[0_45px_120px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex h-12 items-center justify-between border-b border-white/8 bg-white/[0.025] px-4 sm:px-5">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/45">
            <Sparkles className="size-3 text-primary" />
            {v.studioTitle}
          </div>
          <span className="flex items-center gap-1.5 text-[9px] text-status-published">
            <span className="landing-pulse size-1.5 rounded-full bg-status-published" />
            {v.ready}
          </span>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_0.9fr]">
            <article className="landing-reveal rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-white/7 text-white/55">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-white/30">
                      {v.sourceArticle}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-white/75">{v.companyBlog}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/8 px-2 py-1 text-[8px] text-white/35">
                  {v.imported}
                </span>
              </div>
              <div className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3">
                <p className="text-xs font-medium leading-snug text-white/80">{v.articleTitle}</p>
                <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-white/35">
                  {v.articleBody}
                </p>
                <div className="mt-3 flex gap-1.5">
                  <span className="h-1.5 w-20 rounded-full bg-white/10" />
                  <span className="h-1.5 w-12 rounded-full bg-white/7" />
                </div>
              </div>
            </article>

            <div className="flex items-center justify-center py-1 lg:px-1">
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[9px] font-medium text-primary shadow-lg shadow-primary/5">
                <Sparkles className="size-3.5" />
                {v.aiTransforms}
                <ArrowDown className="size-3" />
              </div>
            </div>

            <article className="landing-reveal landing-delay-1 rounded-2xl border border-primary/15 bg-primary/[0.055] p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Palette className="size-4" />
                </span>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-primary/65">
                    {v.brandContext}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">
                    {v.tailoredBeforeGeneration}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-2">
                <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <dt className="text-[9px] text-white/30">{v.company}</dt>
                  <dd className="text-[10px] font-medium text-white/65">Northstar Labs</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-[9px] text-white/30">
                    <MessageSquareText className="size-3" />
                    {v.brandTone}
                  </dt>
                  <dd className="text-[10px] font-medium text-white/65">{v.toneProfessional}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-[9px] text-white/30">
                    <Languages className="size-3" />
                    {v.outputLanguage}
                  </dt>
                  <dd className="text-[10px] font-medium text-white/65">{outputLanguage}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/8" />
            <span className="flex items-center gap-2 rounded-full border border-status-published/20 bg-status-published/8 px-3 py-1.5 text-[9px] font-medium text-status-published">
              <Check className="size-3" />
              {v.postsGenerated}
            </span>
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {OUTPUT_META.map((output, index) => {
              const Icon = "icon" in output ? output.icon : null;
              return (
                <article
                  key={output.id}
                  className="landing-reveal group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/25"
                  style={{ animationDelay: `${180 + index * 120}ms` }}
                >
                  <header className="flex items-center justify-between border-b border-white/8 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-white/70">
                      {Icon ? <Icon className="size-3.5" /> : <span className="text-xs">𝕏</span>}
                      {output.label}
                    </div>
                    <span className="text-[8px] text-white/25">{output.format}</span>
                  </header>
                  <div className="grid grid-cols-[78px_1fr] gap-3 p-3 sm:grid-cols-1 lg:grid-cols-[90px_1fr]">
                    <div
                      className={`relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br ${output.color}`}
                    >
                      <div className="absolute -right-5 -top-5 size-16 rounded-full border-[10px] border-white/15" />
                      <div className="absolute inset-x-2.5 bottom-2.5 text-[8px] font-semibold leading-tight text-white">
                        {v.imageOverlay}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-primary/75">
                        <ImageIcon className="size-2.5" />
                        {v.visual}
                        <span className="text-white/20">+</span>
                        <MessageSquareText className="size-2.5" />
                        {v.caption}
                      </div>
                      <p className="mt-2 line-clamp-3 text-[9px] leading-relaxed text-white/48">
                        {v.outputCaptions[index]}
                      </p>
                      <div className="mt-auto pt-2">
                        <span className="inline-flex items-center gap-1 text-[8px] text-status-published">
                          <Check className="size-2.5" />
                          {v.onBrand}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-muted-foreground">
        <span>{v.flowSteps[0]}</span>
        <ArrowRight className="size-3" />
        <span>{v.flowSteps[1]}</span>
        <ArrowRight className="size-3" />
        <span>{v.flowSteps[2]}</span>
      </div>
    </div>
  );
}
