import type { LandingLocale } from "@/i18n/types";

export const LOCALE_STORAGE_KEY = "campaignhub-landing-locale";

export function readStoredLocale(): LandingLocale {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LOCALE_STORAGE_KEY) === "tr" ? "tr" : "en";
}

export function persistLocale(locale: LandingLocale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export { applyDocumentLocale } from "@/i18n/document-meta";
