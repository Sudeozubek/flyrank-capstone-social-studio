import { Link } from "@tanstack/react-router";
import { useLandingI18n } from "@/i18n";

export function LandingFooter() {
  const { t } = useLandingI18n();

  return (
    <footer className="landing-footer border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to="/" className="inline-flex items-center">
              <span className="font-display text-xl font-bold tracking-[-0.04em]">
                <span className="text-foreground">Campaign</span>
                <span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t.footer.description}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.footer.features}
            </a>
            <a
              href="#how-it-works"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.footer.howItWorks}
            </a>
            <span className="text-muted-foreground/70">{t.footer.mcpNote}</span>
          </div>
        </div>
        <p className="mt-10 border-t border-border/70 pt-6 font-mono text-[10px] tracking-wider text-muted-foreground">
          <span className="uppercase">© {new Date().getFullYear()} CampaignHub · </span>
          {t.footer.developedBy ? <span>{t.footer.developedBy} </span> : null}
          <a
            href="https://www.linkedin.com/in/sudeozubek/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-primary/60 underline-offset-[3px] transition-colors hover:text-primary hover:decoration-primary"
          >
            Sude Özübek
          </a>
          {t.footer.developedBySuffix ? <span>{t.footer.developedBySuffix}</span> : null}
        </p>
      </div>
    </footer>
  );
}
