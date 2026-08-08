import type { LandingMessages } from "@/i18n/types";

export const landingEn: LandingMessages = {
  meta: {
    title: "CampaignHub — multi-platform social campaign publisher",
    description:
      "Turn one blog post into platform-native captions and image variants, then publish them through a durable, idempotent, webhook-confirmed pipeline.",
    ogTitle: "CampaignHub — social campaign publisher",
    ogDescription: "Captions, image variants, durable scheduling and signed delivery webhooks.",
  },
  nav: {
    features: "Features",
    howItWorks: "How it works",
    signIn: "Sign in",
    getStarted: "Get started",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
    chooseLanguage: "Site language",
    mcpNote: "AI clients manage campaigns through our MCP server.",
  },
  hero: {
    badge: "AI-powered social campaign studio",
    title: "Your best content,",
    titleAccent: "ready for every platform.",
    body:
      "Transform one article into polished, platform-native campaigns. CampaignHub writes, designs, schedules and reliably delivers every post from one focused workspace.",
    ctaPrimary: "Create your first campaign",
    ctaSecondary: "See how it works",
    trustItems: ["No duplicate posts", "Budget-aware AI", "Signed delivery"],
  },
  stats: [
    { value: "3 platforms", label: "Instagram, X and LinkedIn" },
    { value: "10 tones", label: "From friendly to authoritative" },
    { value: "6 languages", label: "Adapt content for your audience" },
    { value: "1 workflow", label: "Visuals, captions and delivery" },
  ],
  benefits: {
    eyebrow: "Create once, adapt intelligently",
    title: "Stop rebuilding the same campaign three times.",
    body:
      "CampaignHub removes repetitive rewriting and resizing while keeping the parts that make your company sound like itself.",
    items: [
      {
        title: "Move from article to campaign faster",
        body:
          "Generate platform-ready copy and visuals together instead of briefing, rewriting and resizing each post manually.",
      },
      {
        title: "Keep every post true to your brand",
        body:
          "Apply your company name and choose from 10 distinct tones, from professional and authoritative to friendly or playful.",
      },
      {
        title: "Speak to audiences in their language",
        body: "Create complete campaigns in English, Türkçe, Deutsch, Bosanski, Français or العربية.",
      },
    ],
  },
  workflow: {
    eyebrow: "A simpler workflow",
    title: "From published article to polished campaign",
    body: "Keep creative work and delivery operations in one clear, repeatable flow.",
    steps: [
      {
        step: "01",
        title: "Bring your content",
        body: "Pick from the live blog library, paste an article, or upload Markdown, PDF or DOCX.",
      },
      {
        step: "02",
        title: "Shape every variant",
        body: "Generate on-brand captions and correctly framed visuals for each social network.",
      },
      {
        step: "03",
        title: "Schedule with confidence",
        body: "Publish now or later through a delivery flow built to handle retries and rate limits.",
      },
    ],
  },
  features: {
    eyebrow: "Built for real delivery",
    title: "Creative tools up front. Production discipline underneath.",
    body:
      "CampaignHub makes complex publishing infrastructure feel calm and understandable, without hiding what is happening to your campaign.",
    deliveryNote: "Every terminal status is confirmed by a signed callback.",
    items: [
      {
        title: "Platform-native assets",
        body:
          "One post becomes Instagram, X and LinkedIn variants — each with its own voice, length and visual format.",
        detail: "1080×1080 · 1600×900 · 1200×627",
      },
      {
        title: "Idempotent publishing",
        body:
          "Every attempt carries a deterministic key, so retries and crashes never create a duplicate remote post.",
        detail: "Safe retries · no duplicates",
      },
      {
        title: "Durable scheduling",
        body:
          "Scheduled work survives interrupted workers and resumes safely without losing its place in the queue.",
        detail: "Lease-based recovery",
      },
      {
        title: "Verified delivery",
        body:
          "Signed callbacks confirm what was delivered, while every attempt remains visible in a complete audit trail.",
        detail: "HMAC-verified callbacks",
      },
    ],
  },
  cta: {
    eyebrow: "Your next campaign",
    title: "Give your best content the reach it deserves.",
    body:
      "Import an article and create a complete, platform-ready campaign from one focused workspace.",
    primary: "Create your workspace",
    secondary: "Sign in",
  },
  footer: {
    description: "One focused workspace for platform-native social campaigns.",
    features: "Features",
    howItWorks: "How it works",
    developedBy: "Developed by",
    developedBySuffix: "",
    mcpNote: "AI clients manage campaigns through our MCP server.",
  },
  heroGeneration: {
    blogArticle: "Blog article",
    sourceContent: "Source content",
    aiGeneration: "AI Generation",
    aiSubtitle: "Tone · Language · Brand",
    instagramMeta: "Instagram · 1080×1080",
    instagramStatus: "Generated · On-brand",
    instagramVisual: "One idea.\nEvery platform.",
    instagramCaption:
      "Great content deserves more reach. Here is how modern teams turn one article into a full social campaign ✨",
    xMeta: "X · 1600×900",
    xStatus: "Generated · 278 chars",
    xCaption: "One article. Three platforms. Zero repetitive rewriting.",
    xVisual: "Ship campaigns, not chores.",
    linkedinMeta: "LinkedIn · 1200×627",
    linkedinStatus: "Generated · Professional tone",
    linkedinCaption:
      "Three practical lessons for teams building a repeatable content engine — from the people who ship one every week.",
    linkedinEngagement: "486 · 32 comments",
  },
  heroVisual: {
    studioTitle: "CampaignHub AI Studio",
    ready: "Ready",
    sourceArticle: "Source article",
    companyBlog: "Company blog",
    imported: "Imported",
    articleTitle: "How great teams build a repeatable content engine",
    articleBody:
      "A practical guide to turning deep company knowledge into clear, useful content without losing quality or brand consistency.",
    aiTransforms: "AI transforms",
    brandContext: "Brand context",
    tailoredBeforeGeneration: "Tailored before generation",
    company: "Company",
    brandTone: "Brand tone",
    outputLanguage: "Output language",
    toneProfessional: "Professional",
    languageEnglish: "English",
    languageTurkish: "Türkçe",
    postsGenerated: "3 platform posts generated",
    visual: "Visual",
    caption: "Caption",
    onBrand: "On-brand",
    outputCaptions: [
      "Build a content engine that keeps your brand voice intact — on every channel.",
      "One article. Three channels. A consistent voice, without hours of rewriting.",
      "How modern teams turn long-form insight into an on-brand social campaign.",
    ],
    imageOverlay: "Ideas that travel further.",
    flowSteps: [
      "One source article",
      "Brand + tone + language applied",
      "3 visuals + 3 tailored captions",
    ],
  },
};
