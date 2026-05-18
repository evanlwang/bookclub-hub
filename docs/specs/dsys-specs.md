# Design System Specs

**LLD**: docs/llds/design-system.md
**Implementing artifacts**:
- Tokens: `src/app/globals.css`
- Components: `src/components/ui/`
- Tests: forthcoming (`tests/unit/design-system/`, `tests/unit/components/`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Token Taxonomy

- `[x]` **DSYS-TOKEN-001**: The system SHALL define every design token in `src/app/globals.css` inside a Tailwind v4 `@theme` block.
- `[x]` **DSYS-TOKEN-002**: Every design token name SHALL begin with a category prefix — `--color-*`, `--radius-*`, `--shadow-*`, or `--font-*`.
- `[x]` **DSYS-TOKEN-003**: The codebase SHALL NOT use inline `style` literals (or Tailwind arbitrary-value classes containing literal color/radius/shadow values) for color, font, radius, or shadow properties; token references SHALL be made via Tailwind utility classes that resolve to the token name. Exemptions: (a) positional or computed inline styles (`left`, `top`, `transform`, `width`, `animationDelay`); (b) dynamic token references where the token index is computed at render time and cannot be statically resolved by Tailwind (must be LLD-documented per primitive; current: ChapterChip per `COMP-CHAPTER-CHIP-004`); (c) component-private values declared as exempt in the component's LLD (current: BookCover per `COMP-BOOK-COVER-010`). Enforcement: lint rule per `DSYS-TOOL-001`.
- `[x]` **DSYS-TOKEN-004**: When adding a new token, the system SHALL define it in `globals.css` and reference it only by name in specs (never by value).
- `[x]` **DSYS-TOKEN-005**: Token names SHALL be mode-agnostic — `--color-bg`, not `--color-bg-light` — so a dark theme can ship as a value swap, not a rename.
- `[x]` **DSYS-TOKEN-006**: Every interactive color token SHALL provide a `-hover` variant matching the base name (e.g., `--color-primary` → `--color-primary-hover`). `--color-danger-hover` and `--color-accent-hover` ship in `globals.css`.
- `[x]` **DSYS-TOKEN-007**: The system SHALL define `--color-warning-ink` to mirror the `-ink` shape of `--color-primary-ink` and `--color-accent-ink`. Badge warning tone consumes it via the `text-warning-ink` utility.

## Focus Contract

- `[x]` **DSYS-FOCUS-001**: Every focusable element SHALL receive a visible focus indicator via the global `:focus-visible` rule (`outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: 4px`).
- `[x]` **DSYS-FOCUS-002**: Components SHALL NOT define per-variant focus styles unless the component's geometry visually clips the global ring; any such override SHALL be LLD-documented.
- `[x]` **DSYS-FOCUS-003**: The focus indicator SHALL only render on keyboard focus (`:focus-visible`), not on pointer focus.

## Motion Contract

- `[x]` **DSYS-MOTION-001**: Interactive state transitions (background, color, border, shadow, transform, opacity) SHALL default to `150ms ease`.
- `[x]` **DSYS-MOTION-002**: Where `prefers-reduced-motion` is `reduce`, the system SHALL suppress all CSS animations and transitions globally via `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` in `globals.css`.
- `[x]` **DSYS-MOTION-003**: The progress-bar fill keyframe (`bar-fill`) SHALL use `500ms cubic-bezier(0.2, 0.7, 0.2, 1)`.
- `[x]` **DSYS-MOTION-004**: Toast (`toast-in`) and fade-in animations SHALL use `150ms ease`.
- `[x]` **DSYS-MOTION-005**: Slide-down animations SHALL use `200ms ease`.

## Accessibility Baseline

- `[x]` **DSYS-A11Y-001**: All primitive color combinations defined in the LLDs SHALL meet WCAG AA contrast (4.5:1 for body text) on their default token pairings. Verification: axe-core in component test pattern.
- `[x]` **DSYS-A11Y-002**: Decorative icons SHALL set `aria-hidden="true"` by default; semantic meaning is the responsibility of the consuming component via `aria-label` on the interactive parent.
- `[x]` **DSYS-A11Y-003**: Every form control SHALL have an associated `<label>` (either wrapping or via `htmlFor`).
- `[x]` **DSYS-A11Y-004**: Every disabled interactive element SHALL be both visually distinct (opacity ≤ 0.5 and `cursor: not-allowed`) AND programmatically disabled (native `disabled` attribute + `aria-disabled="true"`). Button and DateTimePicker day cells set both.

## Variant Composition

- `[x]` **DSYS-VAR-001**: For every primitive that has interactive state, state priority SHALL be `disabled > loading > hover > default`.
- `[x]` **DSYS-VAR-002**: Where a primitive declares both a `loading` state and a `disabled` state, `loading` SHALL imply `disabled` — suppress pointer events and set the native `disabled` attribute. Visual treatment of the loading state (spinner, opacity, label) is per-primitive and SHALL be specified in that primitive's `COMP-*` specs.
- `[x]` **DSYS-VAR-003**: The global `:focus-visible` ring SHALL apply on top of any state — focus is orthogonal to variant and state.

## Theming

- `[x]` **DSYS-THEME-001**: v1 SHALL render in a single light theme using `oklch()` color notation.
- `[D]` **DSYS-THEME-002**: Where `prefers-color-scheme` is `dark`, the system SHALL swap token values inside a `@media` block without renaming tokens. Deferred — token naming is forward-compatible.
- `[D]` **DSYS-THEME-003**: Per-club theming via DOM-scoped (rather than `:root`-scoped) token overrides. Deferred — out of v1 scope.

## Tooling

- `[x]` **DSYS-TOOL-001**: An ESLint rule SHALL flag inline `style` props containing literal color, font, radius, or shadow values, enforcing `DSYS-TOKEN-003`. The rule SHALL exempt (a) positional or computed properties (`left`, `top`, `transform`, `width`, `marginLeft`, `animationDelay`, etc.); (b) dynamic token references that compute the token name at render time (e.g., `` `var(--color-chip-${idx})` ``); (c) **component-private** exemptions declared at the top of a primitive's source file via `eslint-disable no-restricted-syntax` comments citing the spec ID (currently: BookCover per `COMP-BOOK-COVER-010`); and (d) **page-private** exemptions declared at the top of a page file via the same mechanism, used when a page's aesthetic gradients/inks are page-unique and don't warrant promotion to global tokens (currently: `decided-phase.tsx` winner banner, `clubs/[clubId]/page.tsx` dashboard decorative gradients, `app/page.tsx` landing backdrop, `settings-form.tsx` color-picker rainbow). Three `no-restricted-syntax` selectors cover inline `style`, Tailwind arbitrary-value color classes, and SVG `fill`/`stroke` attributes.
- `[ ]` **DSYS-A11Y-005**: Component tests SHALL run axe-core contrast assertions on every documented variant combination per `DSYS-A11Y-001`. Active gap — axe-core integration is part of the Phase 5 test-suite work.
