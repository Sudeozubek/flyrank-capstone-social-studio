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
    "We shipped something worth reading.",
    "Fresh off the {brand} blog.",
    "New write-up, straight from the build log.",
    "Here's what we learned this week.",
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
    tone: "terse, punchy, one idea only",
    template: "{title}\n\n{summary} {cta} {url} {hashtags}",
    ctas: ["Full write-up:", "Read it:", "Details:"],
    hashtags: ["BuildInPublic"],
    targetLength: 240,
    summarySentences: 1,
    emoji: false,
    lineBreaks: false,
  },
  instagram: {
    tone: "warm, narrative, scannable with line breaks and light emoji",
    template:
      "{hook} ✨\n\n{title}\n\n{summary}\n\n{value}\n\n{cta} (link in bio)\n{url}\n\n{signOff}\n\n{hashtags}",
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
};
