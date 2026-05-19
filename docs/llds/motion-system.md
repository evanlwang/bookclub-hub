# Motion System

## Context and Design Philosophy

Motion in BookClub Hub started ad-hoc: a handful of hand-rolled CSS keyframes in `globals.css` (`bar-fill`, `toast-in`, `fade-in`, `slide-down`), scattered Tailwind `transition-*` utilities, and a global `prefers-reduced-motion` carve-out. Tasteful but inconsistent — every "should this slide in?" decision was a one-off, and there was no way to animate component *unmount* (CSS can't observe a React component leaving the tree).

This LLD owns the motion-system layer that sits beside the design system: a small, opinionated set of duration / easing / stagger tokens, a curated preset catalog, and a single hook (`useMotionPreset`) that every Motion-based component routes through. Reduced-motion is honored once, at the hook, so consumers never branch on user preference at the call site.

The system has two paths that share token values but differ in capability:

- **CSS path** — `globals.css` keyframes and Tailwind utilities. Cheap, SSR-safe, no JS cost. Use for skeletons, simple entrances, hover transitions.
- **JS path** — `motion/react` (the Motion for React package, formerly Framer Motion). Use when you need `AnimatePresence` (mount/unmount), layout animations (FLIP), stagger orchestration, or gesture-driven motion.

Both paths read the same canonical scale from `src/lib/motion/tokens.ts`. CSS duplicates the numeric values inline (it can't import from TS); the spec rule that keeps them in sync is `DSYS-MOTION-006`.

## Token scale

All values live in `src/lib/motion/tokens.ts`.

| Group | Names | Values | Use |
|---|---|---|---|
| `duration` | `instant`, `fast`, `base`, `slow`, `cinematic` | `0.1`, `0.15`, `0.2`, `0.35`, `0.6` (seconds) | UI default is `fast` (interactive feedback) or `base` (entrances). `cinematic` reserved for celebration moments (winner reveal). |
| `easing` | `linear`, `outQuint`, `inOut`, `back` | `linear`, `[0.22, 1, 0.36, 1]`, `[0.65, 0, 0.35, 1]`, `[0.34, 1.56, 0.64, 1]` | `outQuint` is the UI default — most motion settles at rest. `back` overshoots; use only on celebration moments. |
| `stagger` | `tight`, `base`, `loose` | `0.03`, `0.06`, `0.12` (seconds between children) | `base` is the default for list/card grids. `tight` for high-density lists. `loose` for cinematic reveals. |

If you reach for a value between scale steps, that's a sign the scale needs adjusting — not an exception. Talk to the design owner before adding.

## Preset catalog

All presets are `{ initial, animate, exit?, transition }` objects that compose directly with `<motion.div>`. Consume via `useMotionPreset(name)`.

| Preset | Shape | When |
|---|---|---|
| `fadeIn` | opacity 0 → 1 | The fallback "something appeared." |
| `slideUp` | opacity + translateY(8 → 0); exits up | Toasts, ephemeral notifications. |
| `slideDown` | opacity + translateY(-8 → 0); exits down | Dropdowns, popovers, alerts. |
| `scaleIn` | opacity + scale(0.95 → 1) with `back` easing | Modals, dialog content, celebration emphasis. |
| `listItem` | opacity + translateY(6 → 0) | Child of a stagger parent (`listParent` variant). No own `exit`. |
| `cardEnter` | opacity + translateY(12 → 0) | Dashboard cards, content card grids. |
| `modalEnter` | opacity + scale + translateY, `slow` duration | Modal panels (paired with `AnimatePresence`). |

For stagger orchestration, the parent uses `variants={listParent}` and `staggerChildren: stagger.base` (configurable). Children consume `listItem` (or any preset with `initial`/`animate` only).

## When to reach for the JS path

| You want to … | Path |
|---|---|
| A button hover lift | CSS — `transition-all duration-150` Tailwind utility, easing from `outQuint` constant. |
| A skeleton pulse during loading | CSS — `animate-pulse` (Tailwind built-in). |
| A toast that slides in | Either works; **JS** if you also need it to slide *out* on dismiss (CSS can't observe unmount). |
| A modal that animates open AND closed | JS — `AnimatePresence` + `modalEnter`/exit. CSS only gets you "open." |
| A list whose items animate as they're added/removed | JS — `AnimatePresence` + `listItem`. |
| A card grid where items stagger in on mount | JS — `listParent` variant + `listItem` children. |
| A FLIP layout transition (item moves from one container to another) | JS — `layoutId` on the motion component. |
| A scroll-linked animation | Out of scope for this version. Revisit when needed. |

## Reduced-motion contract

Honored on both paths via different mechanisms:

- **CSS**: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` in `globals.css`. Zeros every CSS animation/transition globally.
- **JS**: `useMotionPreset(name)` checks `useReducedMotion()` from `motion/react` and returns an empty preset (`{ initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }`) when true. Result: the element renders at its end state with no movement.

Test reduced-motion behavior by emulating the preference in DevTools (Rendering panel → "Emulate CSS media feature prefers-reduced-motion") or via Playwright (`page.emulateMedia({ reducedMotion: 'reduce' })`).

## Primitive application (Phase 2)

These are the first consumers of the system. Each follows the same pattern: a `"use client"` component, `useMotionPreset(name)`, `<motion.div>`, and (where unmount matters) `AnimatePresence` at the mount point.

| Surface | Spec | Preset | Mount/Unmount mechanism |
|---|---|---|---|
| `ClubSwitcherModal` panel | DSYS-MOTION-MODAL-001 | `modalEnter` | `AnimatePresence` wrapping the portal contents — the modal stays in the tree while `isOpen=false` long enough to play the exit, then is removed. |
| `ClubSwitcherModal` backdrop | DSYS-MOTION-MODAL-001 | `fadeIn` | Same `AnimatePresence` — backdrop and panel exit together. |
| `SavedToast` (progress flow) | DSYS-MOTION-TOAST-001 | `slideUp` | `AnimatePresence` in the parent's render so dismissal animates. |
| `Card` (opt-in) | DSYS-MOTION-CARD-001 | `cardEnter` | Mount-only via `<motion.div>`. No `AnimatePresence` — cards don't typically unmount mid-screen. |
| `ProgressBar` fill | DSYS-MOTION-BAR-001 | n/a (custom `animate={{ scaleX }}`) | Transform-driven. Honors reduced-motion via `useReducedMotion()` directly (the fill's `scaleX` skips to 1 instantly). |

Implementation rules common to every primitive:

- The component file declares `"use client"` (any of these that didn't already need it now do — `motion/react` and `useMotionPreset` are client-only).
- The motion preset is read via `useMotionPreset(...)`. No direct imports from `tokens.ts` inside the primitive.
- For `AnimatePresence` consumers, the conditional render goes *inside* `<AnimatePresence>` — collapsing the wrapper inside the conditional breaks the exit animation (it has no chance to play).
- Tests live in `tests/unit/components/` (jsdom) and assert the contract: the wrapping `<motion.*>` element exists, reduced-motion is honored (via the same `vi.hoisted` + `vi.mock("motion/react", ...)` pattern as `tests/unit/motion/use-motion-preset.test.tsx`).

## Files

| File | Role |
|---|---|
| `src/lib/motion/tokens.ts` | Canonical token + preset definitions. |
| `src/lib/motion/use-motion-preset.ts` | Single entry point for `<motion.*>` consumers; routes through `useReducedMotion`. |
| `src/app/globals.css` (animations section) | CSS path — hand-rolled keyframes that mirror the JS token values. |
| `docs/specs/dsys-specs.md` (Motion Contract section) | EARS specs: DSYS-MOTION-001..007. |

## Open questions / future work

- Should `useMotionPreset` accept a `transitionOverride?` parameter for cases where the preset is right but the timing wants to be `slow` instead of `base`? Defer until a real need shows up.
- Page transitions (between routes) are unaddressed. Next.js App Router has limited hooks; revisit when the View Transitions API stabilizes.
- An ESLint rule could enforce DSYS-MOTION-007 (every `<motion.*>` import comes through `useMotionPreset`). Manual discipline for now.
