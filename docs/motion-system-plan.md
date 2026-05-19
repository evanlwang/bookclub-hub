# Whole-App Motion System (Framer Motion / `motion/react`)

## Context

BookClub Hub has minimal motion today: hand-rolled CSS keyframes (`bar-fill`, `toast-in`, `fade-in`, `slide-down`) in `src/app/globals.css`, scattered Tailwind `transition-*` utilities, and a `prefers-reduced-motion` carve-out (DSYS-MOTION-002). It's tasteful but ad-hoc — no shared duration scale, no easing vocabulary, no entrance/exit pattern for mount/unmount, no stagger primitive. The result: every new "should this slide in?" decision is a one-off.

The goal is a **motion system** — small, opinionated, declarative — so every surface that animates does so consistently and reduced-motion users get a graceful degradation by default. Framer Motion (the rebranded `motion` package, `motion/react` import) is the right substrate: declarative `<motion.*>` components, `AnimatePresence` for mount/unmount, layout animations, gesture support, and a `useReducedMotion()` hook that integrates with our existing accessibility stance.

Scope: build the system, then apply it to the highest-leverage surfaces. Not in scope for this plan: confetti / Lottie / cinematic scroll — once the system is in, those are 1-2 commit add-ons.

## Approach (3 shippable phases, each its own PR)

### Phase 1 — Foundation (`feature/motion-foundation`)

The infrastructure pass. After this lands, nothing in the UI looks different yet, but every primitive needed for Phases 2–3 exists.

**Install**
- `npm install motion` (the canonical Motion for React package; replaces the older `framer-motion` name).

**Motion tokens** (new file `src/lib/motion/tokens.ts`)
- `duration`: `instant: 0.1`, `fast: 0.15`, `base: 0.2`, `slow: 0.35`, `cinematic: 0.6` (seconds).
- `easing`: `linear`, `outQuint: [0.22, 1, 0.36, 1]` (UI default), `inOut: [0.65, 0, 0.35, 1]`, `back: [0.34, 1.56, 0.64, 1]` (used sparingly).
- `stagger`: `tight: 0.03`, `base: 0.06`, `loose: 0.12` (seconds between children).
- One-line rationale comment per group, no documentation files.

**Reduced-motion wrapper** (new file `src/lib/motion/use-motion-preset.ts`)
- `useMotionPreset(name)` returns either a real preset or `{}` when `useReducedMotion()` is true. Centralizes the DSYS-MOTION-002 carve-out so consumers never have to remember.

**Presets** (in `tokens.ts`, exported)
- `fadeIn`, `slideUp`, `slideDown`, `scaleIn`, `listItem` (stagger child), `cardEnter` (combo: fade + small y), `modalEnter`/`modalExit` (paired with `AnimatePresence`).
- Each preset is a plain `{ initial, animate, exit, transition }` object — composes with `<motion.div>` directly.

**Refactor existing CSS keyframes to align**
- `src/app/globals.css`: `fade-in`, `slide-down`, `toast-in`, `bar-fill` — match their durations/easings to the new tokens so the CSS-only path (loading skeletons, etc.) stays consistent with the JS-driven path.
- Keep the existing `prefers-reduced-motion` block — it covers any animation that slips through.

**LID artifacts** (per CLAUDE.md's mandatory linked-intent flow)
- New LLD: `docs/llds/motion-system.md` — covers token scale, preset catalog, when-to-use-motion vs CSS, reduced-motion contract.
- New spec file: `docs/specs/motion-specs.md` (or extend `dsys-specs.md` — pick one based on existing pattern; `dsys-specs.md` exists per the file list).
  - `DSYS-MOTION-001`: motion tokens (duration/easing/stagger scales) SHALL be defined in `src/lib/motion/tokens.ts` and consumed by every animated component.
  - `DSYS-MOTION-002`: (already exists per globals.css comment) — `prefers-reduced-motion: reduce` SHALL zero or disable all animations.
  - `DSYS-MOTION-003`: every `<motion.*>` consumer in `src/` SHALL go through `useMotionPreset()` (lint-checkable later).

**Tests**
- `tests/unit/motion/tokens.test.ts` — assert the shape and ranges (durations all under 1s, easings are length-4 arrays, etc.).
- `tests/unit/motion/use-motion-preset.test.tsx` — mock `useReducedMotion` true/false, assert returned shape.

### Phase 2 — Apply to system primitives (`feature/motion-primitives`)

Drop the system into the components that the whole app already routes through. Highest UX leverage per line changed.

**Modals / dialogs** (`src/components/club/club-switcher-modal.tsx` + any other modal pattern)
- Wrap the modal panel in `<motion.div>` with `modalEnter` + `modalExit`, the backdrop with `fadeIn`/`fadeOut`. Use `AnimatePresence` at the mount point.
- Spec: `DSYS-MOTION-MODAL-001` — modals SHALL mount with `modalEnter` and unmount via `AnimatePresence` with `modalExit`.

**Toasts** (find via `animate-toast-in` usage — currently CSS-only)
- Convert toast container to `<motion.div>` with `slideDown` / `slideUp` pair via `AnimatePresence`. Lets us animate dismissal, which CSS-only currently can't.

**Cards** (`src/components/ui/card.tsx`)
- Add an opt-in `animate?: boolean` prop that wraps the card in `<motion.div>` with `cardEnter`. Default `false` — only opt in on lists/dashboards where entrance matters. Avoids global churn.

**Progress bar** (`src/components/ui/progress-bar.tsx`)
- Replace the existing `bar-anim` CSS class with `<motion.div>` `style={{ transformOrigin: 'left' }}` and `animate={{ scaleX }}`. Keeps the same visual but exposes `delay` cleanly for staggered fills (which the existing component already half-supports).

**Tests**
- One Playwright spec at `tests/e2e/motion-smoke.spec.ts`: opens a modal, asserts it mounts and unmounts cleanly (no detached DOM, no console errors); navigates to the dashboard, asserts cards render (regression — animation doesn't break SSR).

### Phase 3 — Apply to surface delight (`feature/motion-surfaces`)

Use the primitives on the surfaces with the most emotional payoff.

**Dashboard load** (`src/app/clubs/[clubId]/page.tsx`)
- Wrap the card grid in a `<motion.div>` with the `listItem` stagger preset; each card uses `cardEnter`. First paint feels alive.

**Voting page winner reveal** (`src/app/clubs/[clubId]/vote/vote-round.tsx` decided phase)
- Stagger the final-tallies list (existing render at vote-round.tsx:343-366 per the inventory).
- Winner banner: `scaleIn` + brief `back` easing pop.
- Optional follow-up commit: vote-cast feedback — a tiny check-mark `scaleIn` on the nomination card when the user submits.

**Voting page nomination list**
- `<AnimatePresence>` around the nomination cards so add/remove during the nominating phase animates.

**Progress page** (`src/app/clubs/[clubId]/progress/page.tsx`)
- Use the refactored progress bar to stagger member-progress fills.

**Thread list / comments** (`src/app/clubs/[clubId]/discussions/`)
- `AnimatePresence` around comment list so new comments slide in. Use `listItem` for the initial render stagger.

**Spec cluster for Phase 3**
- `DSYS-MOTION-DASH-001`: dashboard cards SHALL stagger-enter using `cardEnter` + `listItem`.
- `DSYS-MOTION-VOTE-REVEAL-001`: the decided-phase tally list SHALL stagger-enter; winner banner SHALL use `scaleIn`.
- `DSYS-MOTION-LIST-001`: nomination, comment, and thread lists SHALL use `AnimatePresence` so add/remove animates.

## Critical files

| File | Phase | Change |
|---|---|---|
| `package.json` | 1 | Add `motion` dep |
| `src/lib/motion/tokens.ts` | 1 | NEW — duration/easing/stagger + presets |
| `src/lib/motion/use-motion-preset.ts` | 1 | NEW — reduced-motion wrapper |
| `src/app/globals.css` | 1 | Align hand-rolled keyframes to new token scale |
| `docs/llds/motion-system.md` | 1 | NEW — system LLD |
| `docs/specs/dsys-specs.md` | 1, 2, 3 | Append `DSYS-MOTION-*` rows |
| `src/components/ui/card.tsx` | 2 | Optional `animate` prop |
| `src/components/ui/progress-bar.tsx` | 2 | Replace `bar-anim` class with motion |
| `src/components/club/club-switcher-modal.tsx` | 2 | Modal mount/unmount via AnimatePresence |
| (toast container — locate via `animate-toast-in`) | 2 | Convert to motion + AnimatePresence |
| `src/app/clubs/[clubId]/page.tsx` | 3 | Dashboard card stagger |
| `src/app/clubs/[clubId]/vote/vote-round.tsx` | 3 | Decided-phase stagger + winner scaleIn |
| `src/app/clubs/[clubId]/progress/page.tsx` | 3 | Staggered progress fills |
| `src/app/clubs/[clubId]/discussions/page.tsx` | 3 | Comment list AnimatePresence |
| `tests/unit/motion/*.test.ts` | 1 | Tokens + reduced-motion unit tests |
| `tests/e2e/motion-smoke.spec.ts` | 2 | Modal mount/unmount smoke |

## Reuse notes

- The `useReducedMotion()` hook ships with `motion/react` — no need to write one. Just check it inside `useMotionPreset()`.
- `src/components/ui/progress-bar.tsx` already accepts a `delay` prop (per inventory) — preserve that API when swapping to motion.
- The existing `prefers-reduced-motion` block in `src/app/globals.css` (lines 119-127, spec DSYS-MOTION-002) stays — covers any CSS path that bypasses the JS layer.
- Skill leverage: invoke the **`frontend-design`** skill when authoring the Phase 3 vote-reveal surface — that's exactly the "creative polished code that avoids generic AI aesthetics" use case.
- No existing shadcn/Radix to integrate with — modal/toast/etc. are custom, so motion adoption is unblocked but also has no off-the-shelf primitives to inherit from.

## Verification

After each phase:

1. **Typecheck + lint**: `npm run typecheck && npm run lint` — clean.
2. **Unit/integration tests**: `npm run test` — no regressions; new motion unit tests pass.
3. **Visual smoke (Playwright MCP)**: navigate to the affected pages in a real browser via the `mcp__plugin_playwright_playwright__browser_*` tools, take a screenshot, verify the animation triggers (or that reduced-motion is honored when emulated).
4. **Reduced-motion check**: in DevTools or via Playwright, emulate `prefers-reduced-motion: reduce` and confirm animations are zeroed.
5. **SSR check**: hard-refresh the page (no client cache) and confirm no hydration errors — Motion is SSR-safe but initial-state mismatches are the usual gotcha.
6. **Bundle delta**: after Phase 1, `npm run build` and note the bundle-size change in the PR description. Motion is ~50KB gz; flag if it grows further than expected.

## Out of scope (defer)

- `canvas-confetti` for winner moment — quick add once Phase 3 lands.
- Lottie animations — only if a specific After-Effects asset is needed.
- Scroll-linked animations / GSAP — not justified by current surfaces.
- Page transitions (next-page-transitions) — Next.js App Router doesn't play well with these; revisit when View Transitions API stabilizes.
- Lint rule enforcing `DSYS-MOTION-003` (motion must go through `useMotionPreset`) — manual discipline for now; codify if it drifts.
