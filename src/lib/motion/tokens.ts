// @spec DSYS-MOTION-006
//
// Motion tokens for the whole-app motion system. Every animated component
// imports from here (and through `useMotionPreset` so reduced-motion is
// honored — DSYS-MOTION-007).
//
// Conventions:
//   - Durations in seconds (Motion's native unit).
//   - Easing is either a CSS keyword or a 4-tuple cubic bezier.
//   - Stagger values are seconds between successive children.

import type { Transition, Variants } from "motion/react";

// Duration scale. Five steps cover ~every UI need; if you reach for something
// in between, that's a sign the system needs adjusting, not an exception.
export const duration = {
  instant: 0.1, // micro feedback (button press, toggle flip)
  fast: 0.15, // small entrances (toast, dropdown)
  base: 0.2, // default for most UI motion
  slow: 0.35, // larger entrances (modal, sheet)
  cinematic: 0.6, // moments — winner reveal, milestone
} as const;

// Easing vocabulary. `outQuint` is the UI default — most motion ends at rest,
// so an "out" curve feels natural. `back` overshoots slightly; use sparingly
// on celebration moments only.
export const easing = {
  linear: "linear",
  outQuint: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  back: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;

// Stagger between siblings (parent's `staggerChildren`). Tight feels almost
// simultaneous; loose is for cinematic reveals.
export const stagger = {
  tight: 0.03,
  base: 0.06,
  loose: 0.12,
} as const;

// Common transition recipes — convenience over composing from scratch.
export const transition = {
  fast: { duration: duration.fast, ease: easing.outQuint } satisfies Transition,
  base: { duration: duration.base, ease: easing.outQuint } satisfies Transition,
  slow: { duration: duration.slow, ease: easing.outQuint } satisfies Transition,
} as const;

// ---- Presets ----
// Each preset is a `{ initial, animate, exit?, transition }` shape that
// composes directly with `<motion.div>` props. AnimatePresence is required
// for presets that define `exit`.

export type MotionPreset = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit?: Record<string, number | string>;
  transition: Transition;
};

export const presets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: transition.fast,
  },
  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: transition.base,
  },
  slideDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: transition.base,
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: duration.base, ease: easing.back },
  },
  // List item — used as a `motion` child of a parent that sets
  // `variants={listParent}` and `staggerChildren`. Variants form so the
  // stagger orchestration on the parent picks them up.
  listItem: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: transition.base,
  },
  cardEnter: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: transition.base,
  },
  modalEnter: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: 4 },
    transition: transition.slow,
  },
} as const satisfies Record<string, MotionPreset>;

export type PresetName = keyof typeof presets;

// Parent orchestration variants for staggered children. Use on the
// container; children consume `presets.listItem` (or any preset that
// declares `initial`/`animate` only — no own transition needed).
export const listParent = {
  hidden: { opacity: 1 }, // container itself doesn't animate; just orchestrates
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.base,
      delayChildren: 0,
    },
  },
} satisfies Variants;
