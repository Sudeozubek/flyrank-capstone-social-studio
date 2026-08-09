import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyDashboardDocumentLocale, dashboardMessages } from "@/i18n/dashboard/catalog";
import { persistLocale, readStoredLocale } from "@/i18n/locale";
import type { DashboardMessages, LandingLocale } from "@/i18n/types";

type DashboardI18nContextValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  t: DashboardMessages;
};

const DashboardI18nContext = createContext<DashboardI18nContextValue | null>(null);

export function DashboardI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>(readStoredLocale);

  const setLocale = (next: LandingLocale) => {
    setLocaleState(next);
    persistLocale(next);
  };

  const t = dashboardMessages[locale];

  useEffect(() => {
    applyDashboardDocumentLocale(locale, t);
  }, [locale, t]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <DashboardI18nContext.Provider value={value}>{children}</DashboardI18nContext.Provider>;
}

export function useDashboardI18n() {
  const context = useContext(DashboardI18nContext);
  if (!context) {
    throw new Error("useDashboardI18n must be used within DashboardI18nProvider");
  }
  return context;
}
