"use client";

import { motion, useReducedMotion } from "motion/react";
import { duration, easing } from "@/lib/motion/tokens";

interface ProgressBarProps {
  percentage: number;
  status?: "reading" | "finished" | "not_started";
  animate?: boolean;
  delay?: number;
}

// @spec COMP-PROGRESS-BAR-001..008, COMP-PROGRESS-BAR-A11Y-001, DSYS-MOTION-BAR-001
export function ProgressBar({
  percentage,
  status = "reading",
  animate,
  delay = 0,
}: ProgressBarProps) {
  const prefersReduced = useReducedMotion();
  const fillColor =
    status === "finished"
      ? "bg-accent"
      : status === "not_started"
        ? "bg-ink-4"
        : "bg-primary";
  // Visual width is unclamped (per COMP-PROGRESS-BAR-006); aria-valuenow clamps
  // for screen-reader correctness (per COMP-PROGRESS-BAR-A11Y-001).
  const ariaValue = Math.min(100, Math.max(0, percentage));
  const scaleX = percentage / 100;

  return (
    <div
      className="h-2 bg-bg-sunken rounded-full overflow-hidden relative"
      role="progressbar"
      aria-valuenow={ariaValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {animate ? (
        <motion.div
          className={`h-full rounded-full ${fillColor}`}
          style={{ width: "100%", transformOrigin: "left" }}
          initial={prefersReduced ? false : { scaleX: 0 }}
          animate={{ scaleX }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { duration: duration.slow, ease: easing.outQuint, delay: delay / 1000 }
          }
        />
      ) : (
        <div
          className={`h-full rounded-full ${fillColor}`}
          style={{
            width: `${percentage}%`,
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}
    </div>
  );
}
