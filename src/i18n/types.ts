export type LandingLocale = "en" | "tr";

export type LandingMessages = {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  nav: {
    features: string;
    howItWorks: string;
    signIn: string;
    getStarted: string;
    switchToLight: string;
    switchToDark: string;
    chooseLanguage: string;
    mcpNote: string;
  };
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustItems: [string, string, string];
  };
  stats: Array<{ value: string; label: string }>;
  benefits: {
    eyebrow: string;
    title: string;
    body: string;
    items: Array<{ title: string; body: string }>;
  };
  workflow: {
    eyebrow: string;
    title: string;
    body: string;
    steps: Array<{ step: string; title: string; body: string }>;
  };
  features: {
    eyebrow: string;
    title: string;
    body: string;
    deliveryNote: string;
    items: Array<{ title: string; body: string; detail: string }>;
  };
  cta: {
    eyebrow: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  footer: {
    description: string;
    features: string;
    howItWorks: string;
    developedBy: string;
    developedBySuffix: string;
    mcpNote: string;
  };
  heroGeneration: {
    blogArticle: string;
    sourceContent: string;
    aiGeneration: string;
    aiSubtitle: string;
    instagramMeta: string;
    instagramStatus: string;
    instagramVisual: string;
    instagramCaption: string;
    xMeta: string;
    xStatus: string;
    xCaption: string;
    xVisual: string;
    linkedinMeta: string;
    linkedinStatus: string;
    linkedinCaption: string;
    linkedinEngagement: string;
  };
  heroVisual: {
    studioTitle: string;
    ready: string;
    sourceArticle: string;
    companyBlog: string;
    imported: string;
    articleTitle: string;
    articleBody: string;
    aiTransforms: string;
    brandContext: string;
    tailoredBeforeGeneration: string;
    company: string;
    brandTone: string;
    outputLanguage: string;
    toneProfessional: string;
    languageEnglish: string;
    languageTurkish: string;
    postsGenerated: string;
    visual: string;
    caption: string;
    onBrand: string;
    outputCaptions: [string, string, string];
    imageOverlay: string;
    flowSteps: [string, string, string];
  };
};

export const LANDING_LOCALE_OPTIONS: Record<
  LandingLocale,
  { code: LandingLocale; short: string; label: string }
> = {
  en: { code: "en", short: "EN", label: "English" },
  tr: { code: "tr", short: "TR", label: "Türkçe" },
};
