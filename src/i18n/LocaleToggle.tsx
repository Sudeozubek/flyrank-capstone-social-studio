import { LANDING_LOCALE_OPTIONS, type LandingLocale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const ORDER: LandingLocale[] = ["en", "tr"];

export function LocaleToggle({
  locale,
  setLocale,
  chooseLanguageLabel,
  className,
  compact = false,
}: {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  chooseLanguageLabel: string;
  className?: string;
  /** Narrow sidebar — stack EN/TR vertically */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex rounded-lg border border-border/80 bg-surface/60 p-0.5 shadow-sm",
        compact ? "w-full max-w-full flex-col gap-0.5" : "",
        className,
      )}
      role="group"
      aria-label={chooseLanguageLabel}
    >
      {ORDER.map((code) => {
        const option = LANDING_LOCALE_OPTIONS[code];
        const active = locale === code;

        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={option.label}
            className={cn(
              "rounded-md font-semibold tracking-wide transition-colors",
              compact
                ? "w-full min-w-0 px-0 py-1 text-[10px] leading-none"
                : "min-w-[2.25rem] px-2 py-1 text-[11px]",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
