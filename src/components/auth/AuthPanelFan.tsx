import type { ReactNode } from "react";
import { Instagram, Linkedin } from "lucide-react";
import type { AuthMessages } from "@/i18n/types";

type FanCardProps = {
  platform: string;
  meta: string;
  status: string;
  caption: string;
  visual: ReactNode;
  icon: ReactNode;
};

function FanCard({ platform, meta, status, caption, visual, icon }: FanCardProps) {
  return (
    <div className="gen-card rounded-2xl p-3.5">
      <div className="flex flex-col items-center gap-1.5 border-b border-slate-100 pb-2.5 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl shadow-sm">{icon}</span>
        <p className="text-sm font-semibold text-slate-800">{platform}</p>
        <p className="text-[10px] text-muted-foreground">{meta}</p>
        <p className="text-[10px] font-medium text-emerald-600">{status}</p>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-lg">{visual}</div>
      <p className="mt-2 line-clamp-1 text-center text-[10px] leading-relaxed text-slate-500">
        {caption}
      </p>
    </div>
  );
}

export function AuthPanelFan({ posts }: { posts: AuthMessages["panel"]["posts"] }) {
  const instagramVisualLines = posts.instagram.visual.split("\n");

  const cards: Array<{ key: string; className: string; card: FanCardProps }> = [
    {
      key: "instagram",
      className: "auth-fan-instagram",
      card: {
        platform: posts.instagram.platform,
        meta: posts.instagram.meta,
        status: posts.instagram.status,
        caption: posts.instagram.caption,
        icon: (
          <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-500 text-white">
            <Instagram className="size-5" />
          </span>
        ),
        visual: (
          <div className="flex aspect-[2.4] items-end bg-gradient-to-br from-orange-300 via-rose-400 to-violet-500 p-2.5">
            <p className="text-xs font-semibold leading-tight text-white drop-shadow">
              {instagramVisualLines.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </div>
        ),
      },
    },
    {
      key: "x",
      className: "auth-fan-x",
      card: {
        platform: posts.x.platform,
        meta: posts.x.meta,
        status: posts.x.status,
        caption: posts.x.caption,
        icon: (
          <span className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-base font-bold text-white">
            𝕏
          </span>
        ),
        visual: (
          <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-r from-slate-200 via-sky-200 to-indigo-300">
            <p className="text-xs font-semibold text-slate-700">{posts.x.visual}</p>
          </div>
        ),
      },
    },
    {
      key: "linkedin",
      className: "auth-fan-linkedin",
      card: {
        platform: posts.linkedin.platform,
        meta: posts.linkedin.meta,
        status: posts.linkedin.status,
        caption: posts.linkedin.caption,
        icon: (
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#0a66c2] text-white">
            <Linkedin className="size-5" />
          </span>
        ),
        visual: (
          <div className="space-y-1.5 bg-slate-50 p-3">
            <span className="block h-1.5 w-full rounded-full bg-slate-200" />
            <span className="block h-1.5 w-4/5 rounded-full bg-slate-200" />
            <span className="block h-1.5 w-3/5 rounded-full bg-slate-200/80" />
          </div>
        ),
      },
    },
  ];

  return (
    <div className="auth-fan-stack select-none" aria-hidden>
      {cards.map(({ key, className, card }) => (
        <div key={key} className={`auth-fan-card ${className}`}>
          <FanCard {...card} />
        </div>
      ))}
    </div>
  );
}
