# ProgressBar Component Specs

**LLD**: docs/llds/components-progress-bar.md
**Implementing artifacts**:
- Component: `src/components/ui/progress-bar.tsx`
- Tests: forthcoming (`tests/unit/components/progress-bar.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-PROGRESS-BAR-001**: The ProgressBar primitive SHALL accept `percentage` (required number, not clamped), `status ∈ {reading, finished, not_started}` (default `reading`), `animate` (optional boolean), and `delay` (optional number, milliseconds).

## Track & Fill

- `[x]` **COMP-PROGRESS-BAR-002**: The track SHALL render at `height: 8px`, `background: --color-bg-sunken`, `border-radius: full`, `overflow: hidden`, and SHALL be `position: relative` so callers can overlay tick marks (e.g., the dashboard hero's per-member ticks).
- `[x]` **COMP-PROGRESS-BAR-003**: While `status` is `reading`, the fill SHALL apply `background: --color-primary`.
- `[x]` **COMP-PROGRESS-BAR-004**: While `status` is `finished`, the fill SHALL apply `background: --color-accent`.
- `[x]` **COMP-PROGRESS-BAR-005**: While `status` is `not_started`, the fill SHALL apply `background: --color-ink-4`.
- `[x]` **COMP-PROGRESS-BAR-006**: The fill SHALL be sized by `width: {percentage}%`; the primitive SHALL NOT clamp `percentage` (the track's `overflow: hidden` clips any visual overflow; callers are responsible for valid input).

## Animation

- `[x]` **COMP-PROGRESS-BAR-007**: When `animate` is true, the fill SHALL play the `bar-fill` keyframe (`500ms cubic-bezier(0.2, 0.7, 0.2, 1)`) on mount with an optional `delay` in milliseconds applied as `animation-delay`.
- `[x]` **COMP-PROGRESS-BAR-008**: When `animate` is false (or unset), width changes SHALL transition over `600ms cubic-bezier(0.4, 0, 0.2, 1)` so live progress updates are smooth without re-playing the entrance animation.

## Accessibility

- `[ ]` **COMP-PROGRESS-BAR-A11Y-001**: The track element SHALL set `role="progressbar"`, `aria-valuenow={Math.min(100, Math.max(0, percentage))}` (clamped to `[0, 100]` for screen-reader correctness only — the visual fill width remains unclamped per `COMP-PROGRESS-BAR-006`), `aria-valuemin="0"`, and `aria-valuemax="100"`. Active gap — none of these are set today; this is the dashboard's primary visualization.

## Motion

- `[ ]` **COMP-PROGRESS-BAR-MOTION-001**: When `prefers-reduced-motion` is `reduce`, both the `bar-fill` keyframe and the width transition SHALL be suppressed (covered by `DSYS-MOTION-002`).

## Deferred

- `[D]` **COMP-PROGRESS-BAR-009**: A `size` prop for thinner indicator bars (4px) in dense list views.
- `[D]` **COMP-PROGRESS-BAR-010**: Indeterminate (shimmer) state for loading.
