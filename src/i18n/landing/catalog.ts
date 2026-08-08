import { landingEn } from "@/i18n/locales/en/landing";
import { landingTr } from "@/i18n/locales/tr/landing";
import { applyDocumentLocale } from "@/i18n/document-meta";
import { LOCALE_STORAGE_KEY, persistLocale, readStoredLocale } from "@/i18n/locale";
import type { LandingLocale, LandingMessages } from "@/i18n/types";

const messages: Record<LandingLocale, LandingMessages> = {
  en: landingEn,
  tr: landingTr,
};

export {
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  messages as landingMessages,
  readStoredLocale,
  persistLocale,
  applyDocumentLocale,
};
