import { HTMLAttributes, ReactNode } from "react";
import { MotionCard } from "./motion-card";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  // @spec DSYS-MOTION-CARD-001 — opt-in entrance animation. Default is false so
  // existing cards stay SSR-static and no client JS is paid for unless asked.
  animate?: boolean;
}

// @spec COMP-CARD-001, COMP-CARD-002, COMP-CARD-003, COMP-CARD-004, DSYS-MOTION-CARD-001
export function Card({ children, className = "", animate, ...rest }: CardProps) {
  if (animate) {
    return (
      <MotionCard className={className} {...rest}>
        {children}
      </MotionCard>
    );
  }

  return (
    <div
      className={`bg-bg border border-line rounded-[var(--radius-lg)] shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
