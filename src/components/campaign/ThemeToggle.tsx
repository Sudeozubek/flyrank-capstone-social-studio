import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Persisted light/dark toggle. Dark is the product's default surface. */
export function ThemeToggle({
  lightLabel = "Switch to light mode",
  darkLabel = "Switch to dark mode",
}: {
  lightLabel?: string;
  darkLabel?: string;
} = {}) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("campaignhub-theme");
    const prefersLight =
      stored === null && window.matchMedia("(prefers-color-scheme: light)").matches;
    const next = stored === "light" || prefersLight;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("campaignhub-theme", next ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 rounded-lg text-muted-foreground"
      onClick={toggle}
      aria-label={light ? darkLabel : lightLabel}
    >
      {light ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </Button>
  );
}
