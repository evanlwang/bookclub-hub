import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-bg border border-line rounded-[var(--radius-lg)] shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
