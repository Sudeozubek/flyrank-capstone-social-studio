import { dashboardEn } from "@/i18n/locales/en/dashboard";
import { dashboardTr } from "@/i18n/locales/tr/dashboard";
import type { DashboardMessages, LandingLocale } from "@/i18n/types";

const messages: Record<LandingLocale, DashboardMessages> = {
  en: dashboardEn,
  tr: dashboardTr,
};

export function applyDashboardDocumentLocale(locale: LandingLocale, t: DashboardMessages) {
  document.documentElement.lang = locale;
  document.title = t.meta.title;

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t.meta.description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t.meta.ogTitle);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", t.meta.ogDescription);
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export { messages as dashboardMessages };
