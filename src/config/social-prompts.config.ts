/**
 * Caption fragment config. Shared brand voice + per-platform overrides.
 * No copy-pasted prompts: the composer assembles from these fragments.
 */

import type { Platform } from "@/domain/entities";

export interface SharedVoice {
  brandName: string;
  hooks: string[];
  valueProps: string[];
  baseHashtags: string[];
  signOff: string;
}

export interface PlatformVoice {
  tone: string;
  /** Tokens: {hook} {title} {summary} {value} {cta} {url} {hashtags} {signOff} */
  template: string;
  ctas: string[];
  hashtags: string[];
  targetLength: number;
  summarySentences: number;
  emoji: boolean;
  lineBreaks: boolean;
}

export const SHARED_VOICE: SharedVoice = {
  brandName: "CampaignHub",
  hooks: [
    "A focused take from our latest article.",
    "Key insight from the {brand} blog.",
    "What practitioners should know about this topic.",
    "Lessons from production, in plain language.",
  ],
  valueProps: [
    "Practical notes from a production pipeline, not theory.",
    "Everything here is running in an internal tool today.",
    "Written by the team that maintains the thing.",
  ],
  baseHashtags: ["ContentOps"],
  signOff: "— the {brand} team",
};

export const PLATFORM_VOICE: Record<Platform, PlatformVoice> = {
  x: {
    tone: "punchy and substantive — short paragraphs, 2–3 crisp ideas, never a single cramped line",
    template: "{hook}\n\n{summary}\n\n{value}\n\n{cta} {url}\n{hashtags}",
    ctas: ["Read:", "Full post:", "→"],
    hashtags: ["BuildInPublic"],
    targetLength: 280,
    summarySentences: 2,
    emoji: false,
    lineBreaks: true,
  },
  instagram: {
    tone: "warm, narrative, scannable with line breaks and light emoji",
    template:
      "{hook}\n\n{title}\n\n{summary}\n\n{value}\n\n{cta} (link in bio)\n{url}\n\n{signOff}\n\n{hashtags}",
    ctas: ["Swipe then read the full post", "Tap through for the whole story"],
    hashtags: [
      "MarketingAutomation",
      "SocialTooling",
      "DevLife",
      "BehindTheBuild",
      "Startup",
      "Engineering",
    ],
    targetLength: 900,
    summarySentences: 3,
    emoji: true,
    lineBreaks: true,
  },
  linkedin: {
    tone: "professional, insight-led, credible — written for practitioners and decision-makers",
    template:
      "{hook}\n\n{title}\n\n{summary}\n\n{value}\n\n{cta}\n{url}\n\n{signOff}\n\n{hashtags}",
    ctas: ["Read the full article", "Continue reading on our blog", "See the complete analysis"],
    hashtags: ["Leadership", "ContentMarketing", "B2B", "SaaS", "Product"],
    targetLength: 1100,
    summarySentences: 2,
    emoji: false,
    lineBreaks: true,
  },
};
