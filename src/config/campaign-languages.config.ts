/**
 * Campaign output languages — captions and image briefs are generated in the
 * selected language. Null / missing values resolve to English (`en`).
 */

import { z } from "zod";
import type { Platform } from "@/domain/entities";

export interface CampaignLanguageOption {
  id: string;
  label: string;
  /** Full language name for LLM prompts. */
  promptName: string;
  hooks: string[];
  valueProps: string[];
  signOff: string;
  ctas: Record<Platform, string[]>;
}

export const DEFAULT_CAMPAIGN_LANGUAGE = "en" as const;

export const CAMPAIGN_LANGUAGE_OPTIONS: readonly CampaignLanguageOption[] = [
  {
    id: "en",
    label: "English",
    promptName: "English",
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
    signOff: "— the {brand} team",
    ctas: {
      x: ["Full write-up:", "Read it:", "Details:"],
      instagram: [
        "Swipe then read the full post",
        "Tap through for the whole story",
        "Read the whole story",
      ],
      linkedin: ["Read the full article", "Continue reading", "Explore the insights"],
    },
  },
  {
    id: "tr",
    label: "Türkçe",
    promptName: "Turkish",
    hooks: [
      "Makaleden öne çıkan bir bakış açısı.",
      "{brand} blogunda bu konuyu derinlemesine ele aldık.",
      "Pratik ekipler için net bir özet.",
      "Üretimden gelen dersler — kısa ve öz.",
    ],
    valueProps: [
      "Teoriden çok, üretimden gelen pratik notlar.",
      "Burada anlattıklarımız bugün canlıda çalışıyor.",
      "Aracı geliştiren ekibin kaleminden.",
    ],
    signOff: "— {brand} ekibi",
    ctas: {
      x: ["Yazının tamamı:", "Oku:", "Detaylar:"],
      instagram: ["Tam yazı için kaydırın", "Hikâyenin tamamı için dokunun", "Tüm yazıyı okuyun"],
      linkedin: ["Makalenin tamamı", "Devamını okuyun", "Detaylı analiz için"],
    },
  },
  {
    id: "de",
    label: "Deutsch",
    promptName: "German",
    hooks: [
      "Neuer Beitrag, den es sich zu lesen lohnt.",
      "Frisch vom {brand}-Blog.",
      "Das haben wir diese Woche gelernt.",
      "Kurz, praktisch und direkt aus der Praxis.",
    ],
    valueProps: [
      "Praxisnahe Notizen statt reiner Theorie.",
      "Alles, was wir beschreiben, läuft bereits produktiv.",
      "Geschrieben vom Team hinter dem Produkt.",
    ],
    signOff: "— das {brand}-Team",
    ctas: {
      x: ["Ganzer Artikel:", "Lesen:", "Details:"],
      instagram: [
        "Für den ganzen Beitrag wischen",
        "Tippen für die ganze Story",
        "Jetzt vollständig lesen",
      ],
      linkedin: ["Ganzen Artikel lesen", "Weiterlesen", "Zur vollständigen Analyse"],
    },
  },
  {
    id: "bs",
    label: "Bosanski",
    promptName: "Bosnian",
    hooks: [
      "Objavili smo novi tekst vrijedan čitanja.",
      "Svježa objava sa {brand} bloga.",
      "Evo šta smo naučili ove sedmice.",
      "Kratko, jasno i iz prakse.",
    ],
    valueProps: [
      "Praktične bilješke iz produkcije, ne samo teorija.",
      "Sve ovdje opisano već radi u praksi.",
      "Pisao tim koji održava proizvod.",
    ],
    signOff: "— {brand} tim",
    ctas: {
      x: ["Cijeli tekst:", "Pročitaj:", "Detalji:"],
      instagram: [
        "Prevucite za cijeli tekst",
        "Dodirnite za cijelu priču",
        "Pročitajte cijeli članak",
      ],
      linkedin: ["Pročitajte cijeli članak", "Nastavite čitanje", "Pogledajte analizu"],
    },
  },
  {
    id: "fr",
    label: "Français",
    promptName: "French",
    hooks: [
      "Un nouvel article qui vaut le détour.",
      "Tout juste publié sur le blog {brand}.",
      "Voici ce que nous avons appris cette semaine.",
      "Court, utile et tiré du terrain.",
    ],
    valueProps: [
      "Des notes pratiques, pas de la théorie abstraite.",
      "Tout ce que nous décrivons tourne déjà en production.",
      "Rédigé par l'équipe qui maintient le produit.",
    ],
    signOff: "— l'équipe {brand}",
    ctas: {
      x: ["Article complet :", "À lire :", "Détails :"],
      instagram: [
        "Faites défiler pour lire l'article",
        "Touchez pour toute l'histoire",
        "Lire l'article complet",
      ],
      linkedin: ["Lire l'article complet", "Continuer la lecture", "Voir l'analyse complète"],
    },
  },
  {
    id: "ar",
    label: "العربية",
    promptName: "Arabic",
    hooks: [
      "نشرنا مقالاً جديداً يستحق القراءة.",
      "منشور جديد من مدونة {brand}.",
      "إليكم ما تعلمناه هذا الأسبوع.",
      "محتوى عملي ومباشر من أرض الواقع.",
    ],
    valueProps: [
      "ملاحظات عملية من بيئة إنتاج حقيقية.",
      "كل ما نصفه يعمل بالفعل في الإنتاج.",
      "بقلم الفريق الذي يطوّر المنتج.",
    ],
    signOff: "— فريق {brand}",
    ctas: {
      x: ["المقال كاملاً:", "اقرأ:", "التفاصيل:"],
      instagram: ["مرّر لقراءة المقال كاملاً", "اضغط لقراءة القصة كاملة", "اقرأ المقال كاملاً"],
      linkedin: ["اقرأ المقال كاملاً", "تابع القراءة", "اكتشف التحليل الكامل"],
    },
  },
] as const;

export type CampaignLanguageId = (typeof CAMPAIGN_LANGUAGE_OPTIONS)[number]["id"];

export const CAMPAIGN_LANGUAGE_IDS = CAMPAIGN_LANGUAGE_OPTIONS.map((lang) => lang.id) as [
  CampaignLanguageId,
  ...CampaignLanguageId[],
];

const languageById = new Map(CAMPAIGN_LANGUAGE_OPTIONS.map((lang) => [lang.id, lang]));

export function resolveCampaignLanguage(language?: string | null): CampaignLanguageOption {
  if (!language?.trim()) return languageById.get(DEFAULT_CAMPAIGN_LANGUAGE)!;
  return (
    languageById.get(language.trim().toLowerCase() as CampaignLanguageId) ??
    languageById.get(DEFAULT_CAMPAIGN_LANGUAGE)!
  );
}

export function getCampaignLanguageLabel(language?: string | null): string {
  return resolveCampaignLanguage(language).label;
}

export const campaignLanguageInputSchema = z
  .enum(CAMPAIGN_LANGUAGE_IDS)
  .nullish()
  .transform((value) => value ?? DEFAULT_CAMPAIGN_LANGUAGE);
