import { ReactNode } from "react";

type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "ink";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-bg-sunken text-ink-2",
  primary: "bg-primary-soft text-primary-ink",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger",
  // @spec COMP-BADGE-INK-001 — dark stamp/label badge (used on dark surfaces).
  ink: "bg-ink text-bg",
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  /** Solid terracotta fill with cream text — the "LIVE" emphasis style. */
  solid?: boolean;
  children: ReactNode;
}

// @spec COMP-BADGE-001, COMP-BADGE-002, COMP-BADGE-003
// @spec COMP-BADGE-004..009 (tone × token map)
// @spec COMP-BADGE-010 (dot indicator), COMP-BADGE-SOLID-001 (LIVE style)
// Cozy redesign: uppercase Nunito-800 pills, 11px, letter-spaced.
export function Badge({ tone = "neutral", dot, solid, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-[var(--font-display)] font-extrabold text-[11px] uppercase tracking-[0.04em] leading-tight px-2.5 py-1 rounded-full ${
        solid ? "bg-primary text-bg" : toneClasses[tone]
      }`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-85" />
      )}
      {children}
    </span>
  );
}
