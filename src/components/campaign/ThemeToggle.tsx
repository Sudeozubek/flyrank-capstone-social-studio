import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Persisted light/dark toggle. Dark is the product's default surface. */
export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("flyrank-theme");
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
    localStorage.setItem("flyrank-theme", next ? "light" : "dark");
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle color theme">
      {light ? "Dark" : "Light"}
    </Button>
  );
}
