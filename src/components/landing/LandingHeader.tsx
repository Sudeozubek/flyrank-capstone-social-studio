import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LandingLocaleToggle, useLandingI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_DELTA = 6;
const TOP_REVEAL_OFFSET = 16;

export function LandingHeader({
  dark,
  onThemeToggle,
}: {
  dark: boolean;
  onThemeToggle: () => void;
}) {
  const { t } = useLandingI18n();
  const [revealed, setRevealed] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY <= TOP_REVEAL_OFFSET) {
        setRevealed(true);
      } else if (delta > SCROLL_DELTA) {
        setRevealed(false);
      } else if (delta < -SCROLL_DELTA) {
        setRevealed(true);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: t.nav.features },
    { href: "#how-it-works", label: t.nav.howItWorks },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl transition-transform duration-300 ease-out",
          revealed ? "translate-y-0" : "-translate-y-full",
        )}
      >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="inline-flex items-center">
          <span className="font-display text-xl font-bold tracking-[-0.04em]">
            <span className="text-foreground">Campaign</span>
            <span className="text-primary">Hub</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <span className="text-[10px] font-medium text-muted-foreground/55">{t.nav.mcpNote}</span>
        </nav>

        <div className="flex items-center gap-2">
          <LandingLocaleToggle />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground"
            onClick={onThemeToggle}
            aria-label={dark ? t.nav.switchToLight : t.nav.switchToDark}
          >
            {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-lg border-border bg-background px-4 text-foreground shadow-sm hover:bg-background/90 sm:inline-flex"
            asChild
          >
            <Link to="/auth" search={{ mode: "signin" }}>
              {t.nav.signIn}
            </Link>
          </Button>
          <Button size="sm" className="rounded-lg px-4" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              {t.nav.getStarted}
            </Link>
          </Button>
        </div>
      </div>
    </header>
    <div className="h-16 shrink-0" aria-hidden />
    </>
  );
}
