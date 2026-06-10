import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

// Cozy redesign: full-pill buttons in Nunito 800. Primary/accent/danger get a
// `0 2px 0` darker bottom edge so they read as physically "pressable"; secondary
// is a card surface with a terracotta-soft inset ring that fills on hover.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg shadow-[0_2px_0_var(--color-primary-hover),0_8px_18px_-6px_var(--color-primary)] hover:bg-primary-hover",
  secondary:
    "bg-bg-soft text-primary shadow-[inset_0_0_0_2px_var(--color-primary-soft),var(--shadow-sm)] hover:shadow-[inset_0_0_0_2px_var(--color-primary),var(--shadow-sm)]",
  ghost:
    "bg-transparent text-ink-2 hover:bg-bg-sunken hover:text-ink",
  danger:
    "bg-danger text-bg shadow-[0_2px_0_var(--color-danger-hover)] hover:bg-danger-hover",
  accent:
    "bg-accent text-ink shadow-[0_2px_0_var(--color-accent-hover),0_8px_18px_-6px_var(--color-accent)] hover:bg-accent-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-[13.5px] px-4 min-h-[36px]",
  md: "text-[15px] px-[22px] min-h-[44px]",
  lg: "text-[17px] px-7 min-h-[52px]",
};

// @spec COMP-BUTTON-001, COMP-BUTTON-002, COMP-BUTTON-003, COMP-BUTTON-004
// @spec COMP-BUTTON-005..014 (variant × default/hover state)
// @spec COMP-BUTTON-015..017 (size matrix)
// @spec COMP-BUTTON-018..021 (disabled/loading state behavior)
// @spec COMP-BUTTON-A11Y-001, COMP-BUTTON-A11Y-002, COMP-BUTTON-A11Y-003
// @spec COMP-BUTTON-MOTION-001, TOUCH-BTN-001
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  type = "button",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={`touch-target inline-flex items-center justify-center gap-1.5 font-[var(--font-display)] font-extrabold rounded-full cursor-pointer select-none transition-all duration-150 ease whitespace-nowrap active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${className} disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
}
