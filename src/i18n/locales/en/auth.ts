import type { AuthMessages } from "@/i18n/types";

export const authEn: AuthMessages = {
  meta: {
    signInTitle: "Sign in · CampaignHub",
    signUpTitle: "Create account · CampaignHub",
    signInDescription:
      "Sign in to CampaignHub to turn blog posts into scheduled, platform-native social campaigns.",
    signUpDescription:
      "Create your CampaignHub workspace and publish platform-ready campaigns from one article.",
  },
  chooseLanguage: "Site language",
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
  panel: {
    title: "Your best content,",
    titleAccent: "ready for every platform.",
    body: "One article → Instagram, X and LinkedIn. Schedule and publish with confidence.",
    posts: {
      instagram: {
        platform: "Instagram",
        meta: "1080×1080",
        status: "Ready · On brand",
        visual: "One idea.\nEvery platform.",
        caption:
          "Great content deserves a wider audience. How one article becomes a full social campaign ✨",
      },
      x: {
        platform: "X",
        meta: "1600×900",
        status: "Ready · 278 chars",
        caption: "One article, three platforms. No more rewriting the same story.",
        visual: "Share the campaign. Focus on the work.",
      },
      linkedin: {
        platform: "LinkedIn",
        meta: "1200×627",
        status: "Ready · Professional tone",
        caption:
          "Three practical tips from teams that publish consistently: how to build a sustainable content rhythm.",
        engagement: "486 · 32 comments",
      },
    },
  },
  form: {
    signInTitle: "Welcome back",
    signUpTitle: "Start your first campaign",
    signInSubtitle: "Sign in to pick up where you left off.",
    signUpSubtitle: "Create a workspace and turn your next article into a campaign in minutes.",
    google: "Continue with Google",
    or: "or",
    email: "Email",
    password: "Password",
    signInSubmit: "Sign in",
    signUpSubmit: "Create account",
    busy: "Working…",
    switchToSignUp: "No account yet? Create one",
    switchToSignIn: "Already have an account? Sign in",
  },
  errors: {
    authFailed: "Authentication failed",
    googleFailed: "Google sign-in failed",
    confirmEmail:
      "Account created but no session. Disable email confirmation in Supabase Auth settings, then try again.",
  },
};
