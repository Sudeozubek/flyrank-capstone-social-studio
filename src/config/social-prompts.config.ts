/**
 * Wk3 — Caption fragment config (equivalent of `config/social-prompts.config.ts`).
 * Shared brand voice + per-platform overrides. No copy-paste duplication:
 * the composer assembles a platform-specific caption from these fragments.
 */

import type { Platform } from "./platform-specs";

export interface SharedVoice {
  brandName: string;
  /** Reusable openers; selection is stable-hashed on the post id. */
  hooks: string[];
  /** Value statements woven into longer-form platforms. */
  valueProps: string[];
  baseHashtags: string[];
  signOff: string;
}

export interface PlatformVoice {
  tone: string;
  /** Template tokens: {hook} {title} {summary} {value} {cta} {url} {hashtags} {signOff} */
  template: string;
  ctas: string[];
  hashtags: string[];
  /** Soft target used before the hard spec limit kicks in. */
  targetLength: number;
  /** Sentences of body summary to include. */
  summarySentences: number;
  emoji: boolean;
  lineBreaks: boolean;
}

export const SHARED_VOICE: SharedVoice = {
  brandName: "FlyRank",
  hooks: [
    "We shipped something worth reading.",
    "Fresh off the FlyRank blog.",
    "New write-up, straight from the build log.",
    "Here's what we learned this week.",
  ],
  valueProps: [
    "Practical notes from a production pipeline, not theory.",
    "Everything here is running in an internal tool today.",
    "Written by the team that maintains the thing.",
  ],
  baseHashtags: ["FlyRank", "ContentOps"],
  signOff: "— the FlyRank team",
};

export const PLATFORM_VOICE: Record<Platform, PlatformVoice> = {
  x: {
    tone: "terse, punchy, lowercase-friendly, one idea only",
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
    ctas: ["Swipe the carousel then read the full post", "Tap through for the whole story"],
    hashtags: ["MarketingAutomation", "SocialTooling", "DevLife", "BehindTheBuild", "Startup", "Engineering"],
    targetLength: 900,
    summarySentences: 3,
    emoji: true,
    lineBreaks: true,
  },
};
