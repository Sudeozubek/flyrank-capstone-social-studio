import { landingEn } from "@/i18n/locales/en/landing";
import { landingTr } from "@/i18n/locales/tr/landing";
import type { LandingLocale, LandingMessages } from "@/i18n/types";

const STORAGE_KEY = "campaignhub-landing-locale";

const messages: Record<LandingLocale, LandingMessages> = {
  en: landingEn,
  tr: landingTr,
};

function readStoredLocale(): LandingLocale {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(STORAGE_KEY) === "tr" ? "tr" : "en";
}

function applyDocumentLocale(locale: LandingLocale, t: LandingMessages) {
  document.documentElement.lang = locale;
  document.title = t.meta.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t.meta.description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t.meta.ogTitle);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", t.meta.ogDescription);
}

export {
  STORAGE_KEY,
  messages as landingMessages,
  readStoredLocale,
  applyDocumentLocale,
};
