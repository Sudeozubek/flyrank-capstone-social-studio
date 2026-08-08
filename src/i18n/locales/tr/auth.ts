import type { AuthMessages } from "@/i18n/types";

export const authTr: AuthMessages = {
  meta: {
    signInTitle: "Giriş yap · CampaignHub",
    signUpTitle: "Hesap oluştur · CampaignHub",
    signInDescription:
      "CampaignHub'a giriş yapın; blog yazılarınızı zamanlanmış, platforma özel sosyal kampanyalara dönüştürün.",
    signUpDescription:
      "CampaignHub çalışma alanınızı oluşturun; tek makaleden platforma hazır kampanyalar yayınlayın.",
  },
  chooseLanguage: "Dil seçimi",
  switchToLight: "Açık mod",
  switchToDark: "Koyu mod",
  panel: {
    title: "En iyi içeriğiniz,",
    titleAccent: "her platforma hazır.",
    body: "Tek makale, üç platform. Güvenle zamanlayın ve yayınlayın.",
    posts: {
      instagram: {
        platform: "Instagram",
        meta: "1080×1080",
        status: "Hazır · Markaya uygun",
        visual: "Tek fikir.\nHer platform.",
        caption:
          "İyi içerik daha fazla kişiye ulaşmalı. Tek makaleyle tam sosyal kampanya nasıl çıkarılır? ✨",
      },
      x: {
        platform: "X",
        meta: "1600×900",
        status: "Hazır · 278 karakter",
        caption: "Tek makale, üç platform. Tekrar tekrar yazmaya gerek yok.",
        visual: "Kampanyayı paylaş, işe odaklan.",
      },
      linkedin: {
        platform: "LinkedIn",
        meta: "1200×627",
        status: "Hazır · Profesyonel ton",
        caption:
          "Düzenli içerik üreten ekiplerden üç pratik öneri: sürdürülebilir bir içerik akışı nasıl kurulur?",
        engagement: "486 · 32 yorum",
      },
    },
  },
  form: {
    signInTitle: "Tekrar hoş geldiniz",
    signUpTitle: "İlk kampanyanızı başlatın",
    signInSubtitle: "Kampanyalarınıza devam etmek için giriş yapın.",
    signUpSubtitle: "Çalışma alanı oluşturun; bir sonraki makalenizi dakikalar içinde kampanyaya dönüştürün.",
    email: "E-posta",
    password: "Şifre",
    signInSubmit: "Giriş yap",
    signUpSubmit: "Hesap oluştur",
    busy: "İşleniyor…",
    switchToSignUp: "Hesabınız yok mu? Kayıt olun",
    switchToSignIn: "Zaten hesabınız var? Giriş yapın",
  },
  errors: {
    authFailed: "Kimlik doğrulama başarısız",
    confirmEmail:
      "Hesap oluşturuldu ancak oturum açılamadı. Supabase Auth ayarlarında e-posta onayını kapatıp tekrar deneyin.",
  },
};
