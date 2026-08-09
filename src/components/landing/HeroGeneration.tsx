import {
  FileText,
  Heart,
  Instagram,
  Linkedin,
  MessageCircle,
  Repeat2,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useLandingI18n } from "@/i18n";

/**
 * Hero-right visual: a source article feeds an AI core, and three
 * platform-native post cards float out of the generation beam.
 */
export function HeroGeneration() {
  const { t } = useLandingI18n();
  const g = t.heroGeneration;
  const instagramVisualLines = g.instagramVisual.split("\n");

  return (
    <div
      className="relative mx-auto h-[520px] w-full max-w-[560px] select-none sm:h-[560px]"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 560 560"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          className="gen-beam"
          d="M118 150 C 170 150, 190 96, 250 96 S 380 108, 420 96"
          stroke="url(#beam-gradient)"
          strokeWidth="1.5"
          strokeDasharray="5 6"
        />
        <path
          className="gen-beam gen-beam-2"
          d="M118 172 C 200 190, 230 262, 300 268 S 400 262, 436 268"
          stroke="url(#beam-gradient)"
          strokeWidth="1.5"
          strokeDasharray="5 6"
        />
        <path
          className="gen-beam gen-beam-3"
          d="M118 190 C 180 240, 200 420, 268 438 S 360 442, 396 438"
          stroke="url(#beam-gradient)"
          strokeWidth="1.5"
          strokeDasharray="5 6"
        />
        <defs>
          <linearGradient id="beam-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.65 0.18 35 / 0.55)" />
            <stop offset="100%" stopColor="oklch(0.65 0.12 300 / 0.35)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute left-0 top-[108px] w-40">
        <div className="gen-card rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FileText className="size-3.5" />
            </span>
            <div>
              <p className="text-[9px] font-semibold text-slate-700">{g.blogArticle}</p>
              <p className="text-[8px] text-slate-400">{g.sourceContent}</p>
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            <span className="block h-1 w-full rounded-full bg-slate-200" />
            <span className="block h-1 w-4/5 rounded-full bg-slate-200" />
            <span className="block h-1 w-3/5 rounded-full bg-slate-200/80" />
          </div>
        </div>
        <div className="relative mx-auto mt-4 w-fit">
          <span className="gen-core-halo absolute inset-0 rounded-full" />
          <div className="relative flex items-center gap-2 rounded-full border border-primary/25 bg-surface/90 py-2 pl-2.5 pr-3.5 shadow-lg shadow-primary/10 backdrop-blur-sm">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-3.5" />
            </span>
            <div className="leading-none">
              <p className="text-[10px] font-semibold text-foreground">{g.aiGeneration}</p>
              <p className="mt-1 text-[8px] text-muted-foreground">{g.aiSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="gen-post gen-post-1 absolute right-0 top-0 w-56">
        <div className="gen-card rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-500 text-white">
              <Instagram className="size-3.5" />
            </span>
            <div>
              <p className="text-[9px] font-semibold text-slate-700">{g.instagramMeta}</p>
              <p className="text-[8px] text-emerald-600">{g.instagramStatus}</p>
            </div>
          </div>
          <div className="mt-2.5 flex aspect-[2.6] items-end overflow-hidden rounded-lg bg-gradient-to-br from-orange-300 via-rose-400 to-violet-500 p-2.5">
            <p className="text-[9px] font-semibold leading-tight text-white drop-shadow">
              {instagramVisualLines.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </div>
          <p className="mt-2 line-clamp-2 text-[8px] leading-relaxed text-slate-500">
            {g.instagramCaption}
          </p>
          <div className="mt-2 flex items-center gap-2.5 border-t border-slate-100 pt-2 text-[8px] text-slate-400">
            <span className="flex items-center gap-1">
              <Heart className="size-3 text-rose-400" />
              2.4k
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3 text-sky-500" />
              148
            </span>
          </div>
        </div>
      </div>

      <div className="gen-post gen-post-2 absolute right-6 top-[196px] w-60 sm:right-2">
        <div className="gen-card rounded-2xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                𝕏
              </span>
              <div>
                <p className="text-[9px] font-semibold text-slate-700">{g.xMeta}</p>
                <p className="text-[8px] text-emerald-600">{g.xStatus}</p>
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[9px] leading-relaxed text-slate-600">
            {g.xCaption}
            <span className="text-sky-600"> #contentops</span>
          </p>
          <div className="mt-2 flex aspect-[16/6] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-slate-200 via-sky-200 to-indigo-300">
            <p className="text-[9px] font-semibold text-slate-700">{g.xVisual}</p>
          </div>
          <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2 text-[8px] text-slate-400">
            <span className="flex items-center gap-1">
              <Repeat2 className="size-3 text-emerald-500" />
              312
            </span>
            <span className="flex items-center gap-1">
              <Heart className="size-3 text-rose-400" />
              1.1k
            </span>
          </div>
        </div>
      </div>

      <div className="gen-post gen-post-3 absolute bottom-0 right-14 w-56 sm:right-10">
        <div className="gen-card rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#0a66c2] text-white">
              <Linkedin className="size-3.5" />
            </span>
            <div>
              <p className="text-[9px] font-semibold text-slate-700">{g.linkedinMeta}</p>
              <p className="text-[8px] text-emerald-600">{g.linkedinStatus}</p>
            </div>
          </div>
          <p className="mt-2.5 line-clamp-3 text-[8px] leading-relaxed text-slate-500">
            {g.linkedinCaption}
          </p>
          <div className="mt-2 space-y-1">
            <span className="block h-1 w-full rounded-full bg-slate-200" />
            <span className="block h-1 w-2/3 rounded-full bg-slate-200" />
          </div>
          <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-[8px] text-slate-400">
            <ThumbsUp className="size-3 text-[#0a66c2]" />
            {g.linkedinEngagement}
          </div>
        </div>
      </div>
    </div>
  );
}
