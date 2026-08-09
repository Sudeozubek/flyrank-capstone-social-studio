import { LocaleToggle } from "@/i18n/LocaleToggle";
import { useDashboardI18n } from "@/i18n/dashboard/context";
import { cn } from "@/lib/utils";

export function DashboardLocaleToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useDashboardI18n();

  return (
    <LocaleToggle
      locale={locale}
      setLocale={setLocale}
      chooseLanguageLabel={t.chooseLanguage}
      compact={compact}
      className={cn(className)}
    />
  );
}
