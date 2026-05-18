# Button Component Specs

**LLD**: docs/llds/components-button.md
**Implementing artifacts**:
- Component: `src/components/ui/button.tsx`
- Tests: forthcoming (`tests/unit/components/button.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-BUTTON-001**: The Button primitive SHALL accept `variant ∈ {primary, secondary, ghost, danger, accent}` and SHALL default to `secondary` when `variant` is unspecified.
- `[x]` **COMP-BUTTON-002**: The Button primitive SHALL accept `size ∈ {sm, md, lg}` and SHALL default to `md` when `size` is unspecified.
- `[ ]` **COMP-BUTTON-003**: The Button primitive SHALL default the underlying `<button>`'s `type` attribute to `"button"`; callers opting into form submission MUST set `type="submit"` explicitly. Active gap — currently relies on the browser default (`"submit"` inside a `<form>`).
- `[x]` **COMP-BUTTON-004**: Every Button SHALL apply `border-radius: var(--radius-md)`, `font-weight: 500`, and `gap: 8px` between `icon`, `children`, and `iconRight` regardless of variant or size.

## Variant × Default State

- `[x]` **COMP-BUTTON-005**: While the `primary` Button is in default state, the system SHALL apply `{ background: --color-primary, color: --color-bg }`.
- `[x]` **COMP-BUTTON-006**: While the `primary` Button is hovered, the system SHALL transition `background` to `--color-primary-hover` over `150ms ease`.
- `[x]` **COMP-BUTTON-007**: While the `secondary` Button is in default state, the system SHALL apply `{ background: --color-bg, color: --color-ink, border: 1px solid --color-line-strong }`.
- `[x]` **COMP-BUTTON-008**: While the `secondary` Button is hovered, the system SHALL transition `background` to `--color-bg-soft` and `border-color` to `--color-ink-4` over `150ms ease`.
- `[x]` **COMP-BUTTON-009**: While the `ghost` Button is in default state, the system SHALL apply `{ background: transparent, color: --color-ink-2 }`.
- `[x]` **COMP-BUTTON-010**: While the `ghost` Button is hovered, the system SHALL transition `background` to `--color-bg-sunken` and `color` to `--color-ink` over `150ms ease`.
- `[x]` **COMP-BUTTON-011**: While the `danger` Button is in default state, the system SHALL apply `{ background: --color-danger, color: white }`.
- `[ ]` **COMP-BUTTON-012**: While the `danger` Button is hovered, the system SHALL transition `background` to `--color-danger-hover` over `150ms ease`. Active gap — current implementation uses `filter: brightness(0.93)` because the `--color-danger-hover` token does not exist (see `DSYS-TOKEN-006`).
- `[x]` **COMP-BUTTON-013**: While the `accent` Button is in default state, the system SHALL apply `{ background: --color-accent, color: --color-ink }`.
- `[ ]` **COMP-BUTTON-014**: While the `accent` Button is hovered, the system SHALL transition `background` to `--color-accent-hover` over `150ms ease`. Active gap — current implementation uses `filter: brightness(0.96)` because the `--color-accent-hover` token does not exist (see `DSYS-TOKEN-006`).

## Size Matrix

- `[x]` **COMP-BUTTON-015**: The `sm` size SHALL render `height: 30px`, `padding: 6px 12px`, `font-size: 13px`.
- `[x]` **COMP-BUTTON-016**: The `md` size SHALL render `height: 38px`, `padding: 8px 16px`, `font-size: 14px`.
- `[x]` **COMP-BUTTON-017**: The `lg` size SHALL render `height: 46px`, `padding: 10px 20px`, `font-size: 15px`.

## State Behavior

- `[x]` **COMP-BUTTON-018**: If `disabled` (or `loading`, which implies disabled), the Button SHALL apply `opacity: 0.5` and `cursor: not-allowed`, AND set the native `disabled` attribute.
- `[x]` **COMP-BUTTON-019**: While `loading` is true, the Button SHALL render a 16×16 `currentColor`-stroked spinner in the icon slot, replacing any `icon` prop, AND set the native `disabled` attribute.
- `[x]` **COMP-BUTTON-020**: While `loading` is true and `iconRight` is provided, `iconRight` SHALL continue to render. (Locks current behavior so it does not drift.)
- `[x]` **COMP-BUTTON-021**: While `loading` is true, the `children` text SHALL continue to render. (Width-stable transition between idle and loading.)

## Accessibility

- `[ ]` **COMP-BUTTON-A11Y-001**: While `loading` is true, the Button SHALL set `aria-busy="true"`. Active gap.
- `[ ]` **COMP-BUTTON-A11Y-002**: While `disabled` (or `loading`), the Button SHALL set `aria-disabled="true"` in addition to the native `disabled` attribute (see `DSYS-A11Y-004`). Active gap.
- `[x]` **COMP-BUTTON-A11Y-003**: The Button SHALL inherit the global `:focus-visible` ring (`DSYS-FOCUS-001`) without per-variant overrides.

## Motion

- `[x]` **COMP-BUTTON-MOTION-001**: The spinner color SHALL inherit from `currentColor` so it picks up the variant's foreground color automatically.

## Deferred

- `[D]` **COMP-BUTTON-022**: `:active` / pressed state styling (e.g., 50ms scale transform).
- `[D]` **COMP-BUTTON-023**: Dedicated `iconOnly` variant with square geometry.
