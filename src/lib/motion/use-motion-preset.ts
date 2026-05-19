// @spec DSYS-MOTION-002, DSYS-MOTION-007
//
// Central wrapper around motion presets. Every consumer of `<motion.*>` in
// the app SHALL route through this hook so:
//   1. Reduced-motion users get a frozen-at-end-state experience (zero
//      duration, no movement) — honors `prefers-reduced-motion: reduce`.
//   2. There's exactly one place to evolve the reduced-motion contract.
//
// Usage:
//   const m = useMotionPreset("cardEnter");
//   return <motion.div {...m}>...</motion.div>;

"use client";

import { useReducedMotion } from "motion/react";
import { presets, type PresetName, type MotionPreset } from "./tokens";

const noop: MotionPreset = {
  initial: {},
  animate: {},
  exit: {},
  transition: { duration: 0 },
};

export function useMotionPreset(name: PresetName): MotionPreset {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return noop;
  return presets[name];
}
