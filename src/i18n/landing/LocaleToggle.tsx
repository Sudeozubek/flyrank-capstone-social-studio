import { LANDING_LOCALE_OPTIONS, type LandingLocale } from "@/i18n/types";
import { useLandingI18n } from "@/i18n/landing/context";
import { LocaleToggle } from "@/i18n/LocaleToggle";

export function LandingLocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLandingI18n();

  return (
    <LocaleToggle
      locale={locale}
      setLocale={setLocale}
      chooseLanguageLabel={t.nav.chooseLanguage}
      className={className}
    />
  );
}
