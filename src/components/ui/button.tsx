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

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "bg-bg text-ink border border-line-strong shadow-sm hover:bg-bg-soft hover:border-ink-4",
  ghost:
    "bg-transparent text-ink-2 hover:bg-bg-sunken hover:text-ink",
  danger:
    "bg-danger text-white hover:brightness-93",
  accent:
    "bg-accent text-ink hover:brightness-96",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-[13px] px-3 py-1.5 h-[30px]",
  md: "text-sm px-4 py-2 h-[38px]",
  lg: "text-[15px] px-5 py-2.5 h-[46px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-md)] cursor-pointer select-none transition-all duration-150 ease whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className} disabled:cursor-not-allowed`}
      disabled={disabled || loading}
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
