import { LANDING_LOCALE_OPTIONS, type LandingLocale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const ORDER: LandingLocale[] = ["en", "tr"];

export function LocaleToggle({
  locale,
  setLocale,
  chooseLanguageLabel,
  className,
}: {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  chooseLanguageLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex rounded-lg border border-border/80 bg-surface/60 p-0.5 shadow-sm",
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
              "min-w-[2.25rem] rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors",
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
