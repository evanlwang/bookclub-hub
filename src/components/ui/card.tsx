import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// @spec COMP-CARD-001, COMP-CARD-002, COMP-CARD-003, COMP-CARD-004
export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-bg-soft border border-line rounded-[var(--radius-lg)] shadow-md ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
