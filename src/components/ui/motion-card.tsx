"use client";

import { HTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { useMotionPreset } from "@/lib/motion/use-motion-preset";

interface MotionCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// @spec DSYS-MOTION-CARD-001 — the client-only motion path for Card. Kept in a
// separate file so the default Card stays server-renderable with no motion
// bundle cost.
export function MotionCard({
  children,
  className = "",
  ...rest
}: MotionCardProps) {
  const preset = useMotionPreset("cardEnter");
  return (
    <motion.div
      className={`bg-bg border border-line rounded-[var(--radius-lg)] shadow-sm ${className}`}
      initial={preset.initial}
      animate={preset.animate}
      transition={preset.transition}
      {...(rest as HTMLMotionProps<"div">)}
    >
      {children}
    </motion.div>
  );
}
