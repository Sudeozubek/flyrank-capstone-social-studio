import { authEn } from "@/i18n/locales/en/auth";
import { authTr } from "@/i18n/locales/tr/auth";
import type { AuthMessages, LandingLocale } from "@/i18n/types";

const messages: Record<LandingLocale, AuthMessages> = {
  en: authEn,
  tr: authTr,
};

export function applyAuthDocumentLocale(
  locale: LandingLocale,
  t: AuthMessages,
  mode: "signin" | "signup",
) {
  document.documentElement.lang = locale;
  document.title = mode === "signin" ? t.meta.signInTitle : t.meta.signUpTitle;

  const description = document.querySelector('meta[name="description"]');
  const content = mode === "signin" ? t.meta.signInDescription : t.meta.signUpDescription;
  if (description) description.setAttribute("content", content);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", document.title);

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.setAttribute("content", content);
}

export { messages as authMessages };
