import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentLocale,
  landingMessages,
  persistLocale,
  readStoredLocale,
} from "@/i18n/landing/catalog";
import type { LandingLocale, LandingMessages } from "@/i18n/types";

type LandingI18nContextValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  t: LandingMessages;
};

const LandingI18nContext = createContext<LandingI18nContextValue | null>(null);

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>(readStoredLocale);

  const setLocale = (next: LandingLocale) => {
    setLocaleState(next);
    persistLocale(next);
  };

  const t = landingMessages[locale];

  useEffect(() => {
    applyDocumentLocale(locale, t);
  }, [locale, t]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>;
}

export function useLandingI18n() {
  const context = useContext(LandingI18nContext);
  if (!context) {
    throw new Error("useLandingI18n must be used within LandingI18nProvider");
  }
  return context;
}
