# Badge Component Specs

**LLD**: docs/llds/components-badge.md
**Implementing artifacts**:
- Component: `src/components/ui/badge.tsx`
- Tests: forthcoming (`tests/unit/components/badge.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-BADGE-001**: The Badge primitive SHALL accept `tone ∈ {neutral, primary, accent, success, warning, danger}` and SHALL default to `neutral`.
- `[x]` **COMP-BADGE-002**: The Badge primitive SHALL render as an inline `<span>` with `inline-flex`, `align-items: center`, `gap: 6px`, `font-size: 12px`, `font-weight: 500`, `padding: 2px 8px`, `border-radius: full`.
- `[x]` **COMP-BADGE-003**: Badge SHALL NOT carry pointer-interactive behavior or focus styling; it renders as a non-interactive label.

## Tone × Token Map

- `[x]` **COMP-BADGE-004**: While `tone` is `neutral`, the system SHALL apply `{ background: --color-bg-sunken, color: --color-ink-2 }`.
- `[x]` **COMP-BADGE-005**: While `tone` is `primary`, the system SHALL apply `{ background: --color-primary-soft, color: --color-primary-ink }`.
- `[x]` **COMP-BADGE-006**: While `tone` is `accent`, the system SHALL apply `{ background: --color-accent-soft, color: --color-accent-ink }`.
- `[x]` **COMP-BADGE-007**: While `tone` is `success`, the system SHALL apply `{ background: --color-success-soft, color: --color-success }`.
- `[ ]` **COMP-BADGE-008**: While `tone` is `warning`, the system SHALL apply `{ background: --color-warning-soft, color: --color-warning-ink }`. Active gap — current implementation inlines a literal `oklch(0.45 0.10 70)` because `--color-warning-ink` does not exist (see `DSYS-TOKEN-007`).
- `[x]` **COMP-BADGE-009**: While `tone` is `danger`, the system SHALL apply `{ background: --color-danger-soft, color: --color-danger }`.

## Dot Indicator

- `[x]` **COMP-BADGE-010**: Where `dot` is true, the Badge SHALL render a 6×6 circle (`bg-current` at 85% opacity) preceding `children`.

## Accessibility

- `[ ]` **COMP-BADGE-A11Y-001**: When a Badge appears without surrounding contextual text and serves as the sole status label, callers SHALL provide `aria-label` on the Badge or its parent describing the state in words. Enforcement: documentation + lint rule on bare `<Badge>` usage in headers. Active gap — no lint rule today.

## Deferred

- `[D]` **COMP-BADGE-011**: Outlined variant for use on already-tinted surfaces.
- `[D]` **COMP-BADGE-012**: Size variants — current single size is intentional.
