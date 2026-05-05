import { ReactNode } from "react";

type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-bg-sunken text-ink-2",
  primary: "bg-primary-soft text-primary-ink",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-[oklch(0.45_0.10_70)]",
  danger: "bg-danger-soft text-danger",
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${toneClasses[tone]}`}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-85" />
      )}
      {children}
    </span>
  );
}
