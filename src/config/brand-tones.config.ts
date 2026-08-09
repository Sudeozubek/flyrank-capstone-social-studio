/**
 * Predefined brand tones for campaign caption generation.
 * Stored on campaigns as `brand_tone` (tone id). Used by both the deterministic
 * composer and the OpenAI caption writer.
 */

import { z } from "zod";
import type { Platform } from "@/domain/entities";

export interface BrandToneOption {
  id: string;
  label: string;
  description: string;
  hooks: string[];
  valueProps: string[];
  ctas: Record<Platform, string[]>;
  signOff: string;
}

export const BRAND_TONE_OPTIONS: readonly BrandToneOption[] = [
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm, approachable, and conversational — like a helpful colleague sharing a tip.",
    hooks: [
      "Hey — we just published something you might like.",
      "Quick share from the {brand} blog today.",
      "Worth a few minutes of your time.",
      "Something useful landed on our blog.",
    ],
    valueProps: [
      "Written in plain language, no jargon walls.",
      "Practical takeaways you can use right away.",
      "From our team to yours — hope it helps.",
    ],
    ctas: {
      x: ["Check it out:", "Give it a read:", "See for yourself:"],
      instagram: [
        "Tap through when you have a minute",
        "Worth a scroll — full post linked",
        "Read the whole story",
      ],
      linkedin: [
        "Read when you have a moment",
        "Full article linked below",
        "Worth your time — see the post",
      ],
    },
    signOff: "— your friends at {brand}",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Polished, credible, and business-appropriate without sounding stiff.",
    hooks: [
      "New insights from the {brand} team.",
      "We have published a new article.",
      "Latest analysis from our blog.",
      "An update from {brand} on a topic that matters.",
    ],
    valueProps: [
      "Grounded in operational experience, not theory alone.",
      "Clear recommendations backed by real implementation.",
      "Designed for teams shipping production systems.",
    ],
    ctas: {
      x: ["Read the full article:", "Full analysis:", "Details:"],
      instagram: [
        "Read the complete article",
        "Full write-up available now",
        "Explore the full post",
      ],
      linkedin: ["Read the full article", "Continue reading", "Explore the analysis"],
    },
    signOff: "— the {brand} team",
  },
  {
    id: "casual",
    label: "Casual",
    description: "Relaxed and informal — everyday language, low ceremony.",
    hooks: [
      "Dropped a new post.",
      "Blog update — nothing fancy, just useful stuff.",
      "New on the blog if you're curious.",
      "Quick heads-up from {brand}.",
    ],
    valueProps: [
      "No fluff — straight to what we learned.",
      "The kind of note we'd send in a team chat.",
      "Short version: it actually works in production.",
    ],
    ctas: {
      x: ["Link:", "Peek:", "Here:"],
      instagram: [
        "Link in bio if you want the long version",
        "Full post is one tap away",
        "Go read it when you're free",
      ],
      linkedin: ["Link below if you're curious", "Full post here", "Take a look when you can"],
    },
    signOff: "— {brand}",
  },
  {
    id: "enthusiastic",
    label: "Enthusiastic",
    description: "Upbeat, energetic, and genuinely excited to share the content.",
    hooks: [
      "We're so excited to share this one!",
      "This post is a banger — had to share it.",
      "Big news from the {brand} blog!",
      "Cannot wait for you to read this.",
    ],
    valueProps: [
      "This one took real effort and we're proud of it.",
      "Packed with ideas we're already putting to work.",
      "One of our favourite write-ups this quarter.",
    ],
    ctas: {
      x: ["Don't miss it:", "Jump in:", "Read now:"],
      instagram: [
        "You're going to love this one — tap through!",
        "Don't skip this read!",
        "Full post waiting for you",
      ],
      linkedin: [
        "Don't miss this one — read on",
        "Full post linked below",
        "Dive into the details",
      ],
    },
    signOff: "— the excited {brand} crew",
  },
  {
    id: "authoritative",
    label: "Authoritative",
    description: "Confident, expert, and decisive — speaks with earned authority.",
    hooks: [
      "Here's what the data shows.",
      "A definitive guide from {brand}.",
      "The standard approach, explained clearly.",
      "What experienced teams do differently.",
    ],
    valueProps: [
      "Based on patterns observed across production workloads.",
      "Distills years of operational lessons into one read.",
      "Sets a clear benchmark for how this should be done.",
    ],
    ctas: {
      x: ["Read the guide:", "Full breakdown:", "Evidence:"],
      instagram: [
        "Read the definitive breakdown",
        "Full guide — essential reading",
        "Study the complete analysis",
      ],
      linkedin: ["Read the full guide", "See the complete breakdown", "Review the evidence"],
    },
    signOff: "— {brand} experts",
  },
  {
    id: "playful",
    label: "Playful",
    description: "Light-hearted and witty — a touch of humour where it fits.",
    hooks: [
      "Plot twist: we wrote another blog post.",
      "Your feed needed something smarter — here you go.",
      "Fresh words from the {brand} keyboard.",
      "We turned a tricky topic into something readable. You're welcome.",
    ],
    valueProps: [
      "Complex ideas, zero boring parts.",
      "Proof that technical writing doesn't have to hurt.",
      "The fun version of a very real lesson.",
    ],
    ctas: {
      x: ["Treat yourself:", "Go on:", "Worth the click:"],
      instagram: [
        "Treat your brain — tap through",
        "Your scroll just got better",
        "Read it, thank us later",
      ],
      linkedin: ["Worth a click — promise", "Full story below", "Go on, read it"],
    },
    signOff: "— {brand} (yes, we write too)",
  },
  {
    id: "empathetic",
    label: "Empathetic",
    description: "Understanding and supportive — focused on the reader's challenges.",
    hooks: [
      "If this problem sounds familiar, you're not alone.",
      "We wrote this because we've been there too.",
      "For everyone who's wrestled with this — this one's for you.",
      "A gentler take on a hard problem.",
    ],
    valueProps: [
      "Acknowledges the messy reality, not just the ideal case.",
      "Written with the frustration of hitting this issue ourselves.",
      "Meant to save you some of the pain we went through.",
    ],
    ctas: {
      x: ["Hope this helps:", "For you:", "Read if it resonates:"],
      instagram: [
        "If this hits home, read on",
        "Written with you in mind",
        "Full post — we hope it helps",
      ],
      linkedin: [
        "Hope this helps — read on",
        "Full post if it resonates",
        "Written with you in mind",
      ],
    },
    signOff: "— with care, {brand}",
  },
  {
    id: "inspirational",
    label: "Inspirational",
    description: "Motivating and forward-looking — encourages action and growth.",
    hooks: [
      "Small steps today, big wins tomorrow.",
      "What if you could ship this with confidence?",
      "A reminder that better is always possible.",
      "The next chapter starts with what you learn today.",
    ],
    valueProps: [
      "Shows what's achievable when you commit to the craft.",
      "A roadmap for turning ideas into shipped work.",
      "Built to spark your next move, not just inform it.",
    ],
    ctas: {
      x: ["Start here:", "Level up:", "Take the first step:"],
      instagram: [
        "Let this inspire your next move",
        "Read it — then build something",
        "Fuel for your next project",
      ],
      linkedin: ["Read it — then take action", "Full article below", "Fuel for your next move"],
    },
    signOff: "— onward, {brand}",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Direct and concise — every word earns its place.",
    hooks: ["New post.", "Published.", "Blog update.", "Read this."],
    valueProps: ["Short. Useful. Done.", "Only what matters.", "No padding."],
    ctas: {
      x: ["→", "Link:", "Read:"],
      instagram: ["Link in bio", "Full post linked", "Read more"],
      linkedin: ["Read:", "Link:", "Article:"],
    },
    signOff: "— {brand}",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    description: "Narrative-driven — paints a scene and draws the reader in.",
    hooks: [
      "It started with a bug at 2 a.m.",
      "Picture this: the deploy goes green, then everything breaks.",
      "Every team has a story like this one.",
      "Once upon a production incident…",
    ],
    valueProps: [
      "Told as a story, not a spec sheet.",
      "You'll recognise the characters — maybe they're on your team.",
      "The lesson hides inside a narrative you'll actually remember.",
    ],
    ctas: {
      x: ["Read the story:", "How it ends:", "Full tale:"],
      instagram: [
        "See how the story unfolds",
        "Read the full narrative",
        "The ending is worth it — tap through",
      ],
      linkedin: ["Read how it unfolds", "Full narrative below", "See the ending"],
    },
    signOff: "— {brand}, still writing chapters",
  },
] as const;

export type BrandToneId = (typeof BRAND_TONE_OPTIONS)[number]["id"];

export const BRAND_TONE_IDS = BRAND_TONE_OPTIONS.map((tone) => tone.id) as [
  BrandToneId,
  ...BrandToneId[],
];

export const brandToneInputSchema = z
  .union([z.enum(BRAND_TONE_IDS), z.literal("")])
  .nullish()
  .transform((value) => value || null);

const toneById = new Map(BRAND_TONE_OPTIONS.map((tone) => [tone.id, tone]));

export function resolveBrandTone(tone?: string | null): BrandToneOption | null {
  if (!tone?.trim()) return null;
  return toneById.get(tone.trim().toLowerCase()) ?? null;
}

export function getBrandToneLabel(tone?: string | null): string | null {
  return resolveBrandTone(tone)?.label ?? null;
}
