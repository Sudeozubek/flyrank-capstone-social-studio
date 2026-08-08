import type { LandingLocale, LandingMessages } from "@/i18n/types";

export function applyDocumentLocale(locale: LandingLocale, t: LandingMessages) {
  document.documentElement.lang = locale;
  document.title = t.meta.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t.meta.description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t.meta.ogTitle);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", t.meta.ogDescription);
}
