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

export type AuthMessages = {
  meta: {
    signInTitle: string;
    signUpTitle: string;
    signInDescription: string;
    signUpDescription: string;
  };
  chooseLanguage: string;
  switchToLight: string;
  switchToDark: string;
  panel: {
    title: string;
    titleAccent: string;
    body: string;
    posts: {
      instagram: {
        platform: string;
        meta: string;
        status: string;
        visual: string;
        caption: string;
      };
      x: {
        platform: string;
        meta: string;
        status: string;
        caption: string;
        visual: string;
      };
      linkedin: {
        platform: string;
        meta: string;
        status: string;
        caption: string;
        engagement: string;
      };
    };
  };
  form: {
    signInTitle: string;
    signUpTitle: string;
    signInSubtitle: string;
    signUpSubtitle: string;
    email: string;
    password: string;
    signInSubmit: string;
    signUpSubmit: string;
    busy: string;
    switchToSignUp: string;
    switchToSignIn: string;
  };
  errors: {
    authFailed: string;
    confirmEmail: string;
  };
};

export type DashboardMessages = {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  chooseLanguage: string;
  theme: {
    switchToLight: string;
    switchToDark: string;
  };
  layout: {
    brandCampaign: string;
    brandHub: string;
    brandTitle: string;
    brandShort: string;
    campaigns: string;
    library: string;
    activity: string;
    newCampaign: string;
    new: string;
    profile: string;
    account: string;
    signOut: string;
    live: string;
    openProfile: string;
    expandSidebar: string;
    collapseSidebar: string;
    footerRights: string;
    footerVersion: string;
  };
  campaigns: {
    libraryHintOne: string;
    libraryHintMany: string;
    libraryHintBody: string;
    goToLibrary: string;
    badge: string;
    title: string;
    titleAccent: string;
    body: string;
    create: string;
    step: string;
    steps: Array<{ title: string; body: string }>;
  };
  library: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchAria: string;
    filterAria: string;
    allPlatforms: string;
    new: string;
    countOne: string;
    countMany: string;
    platformVariants: string;
    emptyTitle: string;
    emptyBody: string;
    emptyCta: string;
    noMatch: string;
    clearFilters: string;
    sourcePrefix: string;
    manageCampaign: string;
    hideControls: string;
    noVariants: string;
  };
  actions: {
    publishNow: string;
    schedule: string;
    more: string;
    regenerateCaptions: string;
    regenerateImages: string;
    retryFailed: string;
    editCampaign: string;
    delete: string;
    scheduleTime: string;
  };
  ready: {
    title: string;
    body: string;
    open: string;
    stay: string;
    fallbackName: string;
  };
  composer: {
    title: string;
    subtitle: string;
    scrollHint: string;
  };
  activity: {
    title: string;
    subtitle: string;
    aiBudget: string;
    noData: string;
    budgetHint: string;
    noSession: string;
    signed: string;
    signedHint: string;
    signedEmpty: string;
    rejected: string;
    rejectedHint: string;
    rejectedEmpty: string;
    devTools: string;
    devToolsBody: string;
    defaultSchedule: string;
    runTick: string;
    simulateRateLimits: string;
    rateLimitButton: string;
    deliveryLog: string;
    deliveryLogBody: string;
    noEventsTitle: string;
    noEventsBody: string;
    signedEvent: string;
    rejectedEvent: string;
    noMessage: string;
  };
  profile: {
    title: string;
    signedIn: string;
    accountTab: string;
    platformsTab: string;
    changeEmail: string;
    changeEmailBody: string;
    newEmail: string;
    emailPlaceholder: string;
    updateEmail: string;
    changePassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePassword: string;
    forgotPassword: string;
    forgotPasswordBody: string;
    sendReset: string;
    demoNotice: string;
    demoNoticeBody: string;
    connected: string;
    notConnected: string;
    connectedHint: string;
    notConnectedHint: string;
    connect: string;
    disconnect: string;
  };
  variant: {
    noImage: string;
    previewAlt: string;
  };
  aiSpend: {
    title: string;
    subtitle: string;
    ofBudget: string;
    recentCalls: string;
    totalCalls: string;
    emptyRecent: string;
    flatRate: string;
    tokens: string;
    status: {
      disabled: string;
      ok: string;
      warning: string;
      critical: string;
      exhausted: string;
    };
    notes: {
      noKeyTitle: string;
      noKeyBody: string;
      exhaustedTitle: string;
      exhaustedBody: string;
      exhaustedEnv: string;
      criticalTitle: string;
      criticalBody: string;
    };
  };
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
  };
  toasts: {
    campaignDeleted: string;
    campaignUpdated: string;
    publishAttempted: string;
    campaignScheduled: string;
    captionsRegenerated: string;
    imagesRegenerated: string;
    retryQueued: string;
    workerTick: string;
    rateLimit: string;
    createFailed: string;
    actionFailed: string;
    deleteTitle: string;
    deleteDescription: string;
    undo: string;
    emailConfirmTitle: string;
    emailConfirmBody: string;
    emailUpdateFailed: string;
    passwordMinLength: string;
    passwordMismatch: string;
    passwordUpdated: string;
    passwordUpdateFailed: string;
    noEmail: string;
    resetSentTitle: string;
    resetSentBody: string;
    resetFailed: string;
    platformConnected: string;
    disconnected: string;
    demoOAuth: string;
  };
};

export const LANDING_LOCALE_OPTIONS: Record<
  LandingLocale,
  { code: LandingLocale; short: string; label: string }
> = {
  en: { code: "en", short: "EN", label: "English" },
  tr: { code: "tr", short: "TR", label: "Türkçe" },
};
