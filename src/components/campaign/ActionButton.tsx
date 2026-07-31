import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-accent-strong-foreground hover:brightness-108 disabled:opacity-50 shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset]",
  ghost: "border border-border bg-surface-raised text-foreground hover:border-accent-strong/60",
  danger: "border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
};

export function ActionButton({
  variant = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    />
  );
}
