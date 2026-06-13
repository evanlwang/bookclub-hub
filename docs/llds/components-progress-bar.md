# ProgressBar

## Context and Design Philosophy

ProgressBar renders a horizontal track with a colored fill expressing percent-complete. It is the visual heart of the reading-progress feature (dashboard hero, per-member rows, club aggregate). Status drives the fill color — `reading` (primary), `finished` (accent), `not_started` (muted ink) — so the bar is glanceable: "blue = active, amber = done, gray = hasn't started." Implementation: `src/components/ui/progress-bar.tsx`.

## API

```ts
interface ProgressBarProps {
  percentage: number;                                     // 0–100; not clamped
  status?: "reading" | "finished" | "not_started";        // default: "reading"
  animate?: boolean;                                      // play bar-fill animation on mount
  delay?: number;                                         // ms delay applied to animation
}
```

`animate=true` triggers the `bar-fill` keyframe animation (defined in `globals.css`, 500ms `cubic-bezier(0.2, 0.7, 0.2, 1)`) scaling the fill from 0 to 1 along the x-axis. `delay` lets callers stagger animations across rows (e.g., 50ms × row index for a list of members). When `animate=false`, the bar transitions width changes via a `0.6s cubic-bezier(0.4, 0, 0.2, 1)` transition instead — so dragging or live-updating progress is smooth, but mount does not replay the entrance animation.

## Status × token map

| Status | Fill color |
|--------|------------|
| `reading` | `--color-primary` |
| `finished` | `--color-accent` |
| `not_started` | `--color-ink-4` |

Track is always `--color-bg-sunken`. Height is fixed at 8px (`h-2`); shape is `rounded-full`.

## Layout

The track is `relative` so callers can overlay content (the dashboard hero overlays per-member tick marks — see `DASH-UI-HERO-TICKS-001`). The fill is an absolutely-positioned child sized by `width: {percentage}%`.

`percentage` is **not clamped** — passing 120 produces a fill that overflows visually. Track `overflow-hidden` clips it. Callers are responsible for valid input. This is a deliberate choice (clamping silently hides upstream bugs) but worth surfacing as a contract.

## Animation interaction with `prefers-reduced-motion`

Currently does not honor `prefers-reduced-motion`. Both the entrance animation (`animate=true`) and the width transition (`animate=false`) play unconditionally. Will be addressed by the global `DSYS-MOTION-002` rule once that lands.

## Visual reference

`design_handoff_dogear/app-redesign/dogear-progress.jsx` (the canonical row-of-bars view) and `dashboard.jsx` (hero overlay with ticks).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Status drives color | Three discrete states | Continuous color gradient by percentage | Discrete colors carry semantic meaning a gradient can't (finished ≠ "almost there"). [inferred] |
| `not_started` distinct from 0% reading | Yes (muted ink color) | Both render as empty | Lets the dashboard distinguish "haven't picked up yet" from "started, no progress yet." [inferred] |
| Percentage clamping | None | Clamp to [0, 100] at the boundary | Silent clamping hides upstream bugs; track `overflow-hidden` prevents visual breakage. [inferred] |
| Animation control | Caller opt-in via `animate` + `delay` | Always animate; never animate | Lets dashboards stagger entrance reveals without forcing every consumer to. [inferred] |
| Height | Fixed 8px | Variable per use; `size` prop | 8px reads as a bar (not a hairline, not a chunky meter) at every viewing distance. [inferred] |
| Track color | `--color-bg-sunken` | `--color-line` | Sunken reads as "well of the meter"; line would read as a divider. [inferred] |

## Open Questions

### Resolved
1. ✅ Status-driven fill color; fixed 8px height; opt-in animation.
2. ✅ No percentage clamping (contract).

### Deferred / Active gaps
1. **`prefers-reduced-motion` handling.** Suppress both keyframe animation and width transition. Will land via `DSYS-MOTION-002`.
2. **`aria-valuenow` / `role="progressbar"`** are not set today. Critical accessibility gap for the dashboard's primary visualization. Spec: `COMP-PROGRESSBAR-A11Y-001`.
3. **`size` prop** for thinner indicator bars (e.g., 4px in dense list views). Not committed.
4. **Indeterminate state** (loading shimmer). Not committed.

## References

- `src/components/ui/progress-bar.tsx` — implementation.
- `docs/llds/design-system.md` — motion contract.
- `docs/llds/reading-progress.md` — feature LLD that drives most usage.
- `docs/specs/comp-progress-bar-specs.md` — forthcoming.
