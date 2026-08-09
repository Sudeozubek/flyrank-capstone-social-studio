import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyAuthDocumentLocale, authMessages } from "@/i18n/auth/catalog";
import { persistLocale, readStoredLocale } from "@/i18n/locale";
import type { AuthMessages, LandingLocale } from "@/i18n/types";

type AuthI18nContextValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  t: AuthMessages;
};

const AuthI18nContext = createContext<AuthI18nContextValue | null>(null);

export function AuthI18nProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "signin" | "signup";
}) {
  const [locale, setLocaleState] = useState<LandingLocale>(readStoredLocale);

  const setLocale = (next: LandingLocale) => {
    setLocaleState(next);
    persistLocale(next);
  };

  const t = authMessages[locale];

  useEffect(() => {
    applyAuthDocumentLocale(locale, t, mode);
  }, [locale, t, mode]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <AuthI18nContext.Provider value={value}>{children}</AuthI18nContext.Provider>;
}

export function useAuthI18n() {
  const context = useContext(AuthI18nContext);
  if (!context) {
    throw new Error("useAuthI18n must be used within AuthI18nProvider");
  }
  return context;
}
