# Design System

## Context and Design Philosophy

The UI is composed from a small palette of CSS custom properties (the *tokens*) consumed by a handful of React primitives in `src/components/ui/`. The system is split into two layers so that visual values and the behavior that applies them evolve independently:

- **Values** live in `src/app/globals.css` inside a Tailwind v4 `@theme` block. They are data — colors, fonts, radii, shadows. A designer can edit them without touching specs.
- **Behavior** lives in EARS specs (`docs/specs/dsys-specs.md`, `docs/specs/comp-*-specs.md`). Specs reference token *names*, never values. A spec says "the primary button applies `--color-primary`," not "the primary button is `oklch(0.42 0.06 195)`."

Visual judgment (does it *feel* right) is not encoded here. The interactive prototypes in `docs/bookclub-hub-designs/` are the source of visual truth; LLDs point at them but do not try to reconstruct them.

This LLD owns the **system-wide** rules: token taxonomy, naming conventions, theming approach, focus, motion, and the accessibility baseline that every primitive inherits. Per-primitive contracts live in sibling `components-{name}.md` LLDs.

## Token taxonomy

All tokens are defined in `src/app/globals.css`. Categories:

| Category | Prefix | Members |
|----------|--------|---------|
| Color — neutrals (paper + ink) | `--color-bg-*`, `--color-ink-*`, `--color-line-*` | `bg`, `bg-soft`, `bg-sunken`, `ink`, `ink-2`, `ink-3`, `ink-4`, `line`, `line-strong` |
| Color — primary | `--color-primary*` | `primary`, `primary-hover`, `primary-soft`, `primary-ink`, `primary-line` |
| Color — accent | `--color-accent*` | `accent`, `accent-hover`, `accent-soft`, `accent-ink` |
| Color — semantic | `--color-{success,warning,danger}*` | success: base + `-soft`; warning: base + `-soft` + `-ink`; danger: base + `-hover` + `-soft` + `-ink`(via danger) + `-line` |
| Color — chip palette | `--color-chip-{1..5}`, `--color-chip-{1..5}-ink` | five rotating tones for chapter tagging |
| Type — font stacks | `--font-{display,ui,mono}` | Newsreader serif, Geist sans, JetBrains Mono |
| Radius | `--radius-{sm,md,lg,xl}` | 6px / 10px / 14px / 20px |
| Shadow | `--shadow-{sm,md,lg}` | flat / standard card / modal overlay |
| Motion | (animation names + durations) | `bar-fill` 0.5s, `toast-in` 150ms, `fade-in` 150ms, `slide-down` 200ms; default interactive transition is 150ms ease |

No formal spacing scale today — components rely on Tailwind's default spacing utilities (`p-3`, `gap-2`, etc.). A future `--space-*` token family is an open question.

## Naming conventions

- **Category prefix is mandatory.** `--color-*`, `--radius-*`, `--shadow-*`, `--font-*`. No bare names like `--primary`.
- **Modifiers suffix-attached, mode-agnostic.** `--color-primary` (base), `--color-primary-hover` (interactive target), `--color-primary-soft` (low-contrast tinted background), `--color-primary-ink` (text rendered on top of a `-soft` surface), `--color-primary-line` (tinted border used to outline `-soft` panels). Same shape repeats for `accent` and the semantic tokens; not every family ships every modifier (warning only adds `-ink`; success only adds `-soft`).
- **No mode in names.** `--color-bg`, never `--color-bg-light`. Dark mode (deferred) ships by swapping the same names inside a `@media (prefers-color-scheme: dark)` block.
- **Component-private tokens are forbidden.** Components consume the system tokens directly; they don't define their own custom properties unless the value is genuinely unique to the component (e.g., book-cover gradients).
- **Token references go through Tailwind utility classes, not inline `style` literals.** Write `className="bg-primary text-bg"`, not `style={{ background: 'var(--color-primary)' }}` and never `style={{ background: 'oklch(0.42 0.06 195)' }}`. Inline `style` with literal token values (whether the CSS variable reference or the resolved color) is banned because (a) it bypasses the rename safety net the utility-class layer provides and (b) it hides token usage from grep. Inline `style` is acceptable for *positional* properties (`left`, `top`, `transform`) and for *computed* values (a progress percentage, an animated transform); it is not acceptable for color, font, radius, or shadow.

## Theming

One light theme, oklch only. The "warm paper" palette — warm neutrals, deep teal primary, warm amber accent — is the only theme today. Dark mode is deferred. The token names are forward-compatible: a dark theme is a value swap, not a rename.

## Focus contract

Focus is global, not per-component:

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

Per-primitive focus overrides are discouraged. The only legitimate exceptions are (a) primitives whose geometry visually clips the default ring (rare), and (b) primitives that render *inside* another focusable container (avoid altogether). The ring is keyboard-only (`:focus-visible`), not mouse-click.

## Motion contract

| Use | Duration | Easing |
|-----|----------|--------|
| Interactive state transitions (color, bg, border, shadow, transform, opacity) | 150ms | `ease` |
| Toast slide-and-fade | 150ms | `ease` |
| Fade-in (page sections, modals) | 150ms | `ease` |
| Slide-down (dropdowns, expand) | 200ms | `ease` |
| Progress-bar fill | 500ms | `cubic-bezier(0.2, 0.7, 0.2, 1)` |

`prefers-reduced-motion` is **not** currently honored — open gap. The dsys-specs will require it; the implementation cascade will add a single global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` rule plus an opt-out for state changes that must remain animated (none today).

## Variant composition

Every primitive has a `(variant, size, state)` matrix:

- **Variant** is semantic (`primary`, `secondary`, `danger`, etc.) and picks a token *set* (bg, fg, border, hover).
- **Size** picks geometry (height, horizontal padding, font-size, icon size).
- **State** is `default → hover → disabled → loading` with priority `disabled > loading > hover > default`. Focus is orthogonal — applied on top of any state via the global `:focus-visible` rule.
- A `loading` state implies `disabled` for pointer events and `aria-busy="true"` (the latter is an active gap on Button).

## Accessibility baseline

- Every interactive element receives the global focus ring.
- Color pairs are chosen so that body text meets WCAG AA contrast (4.5:1) on its backing surface; small or muted text is the responsibility of the consuming component to validate.
- Icons are decorative (`aria-hidden`) unless the component gives them meaning via `aria-label`.
- Form controls always have an associated `<label>`.
- Disabled state is visual *and* programmatic (`disabled` attribute + reduced opacity + `cursor-not-allowed`).

## Where visual judgment lives

`docs/bookclub-hub-designs/` (interactive prototypes) is the source of visual truth. Specs assert "the right token gets applied"; they do not try to assert "the result looks good." When a prototype and a primitive diverge visually, the prototype wins by default — open a spec ticket to bring the primitive back into line, don't drift the spec.

## Test pattern

- **Token application**: render a primitive, read `getComputedStyle()`, assert the CSS custom property used (e.g., `background-color` resolves to `var(--color-primary)`).
- **State matrix**: snapshot per `(variant, size, state)`.
- **Focus**: tab to the primitive, assert `outline` matches the global rule.
- **Motion**: mock `prefers-reduced-motion: reduce` and assert transitions are suppressed (after the open gap is closed).
- **Accessibility**: `@testing-library/jest-dom` for `disabled`, `aria-busy`, `aria-label`; axe-core for color contrast on rendered combinations.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Token runtime | Tailwind v4 `@theme` block of CSS custom properties | CSS-in-JS (Stitches/vanilla-extract); SCSS variables; utility-class palette only | Native, zero build step, designer-editable. Custom-property names are the contract specs assert on. |
| Color space | `oklch()` | `hsl()`, `rgb()`, hex | Perceptually uniform; predictable lightness across hues; future-proof for wide-gamut displays. [inferred] |
| Theme count (v1) | One (light) | Light + dark from day one | Faster to ship; naming is forward-compatible so dark adds via value swap, not rename. |
| Naming style | Category-prefixed, mode-agnostic (`--color-primary`, `--radius-md`) | Component-scoped (`--button-bg`); mode-tagged (`--color-bg-light`) | Tokens are shared, not component-local; mode-agnostic names survive theme additions. |
| Focus mechanism | Global `:focus-visible` rule on `:root` | Per-component focus styles; no visible focus | Keyboard-accessibility default, single source of truth, never has to be re-implemented. |
| Spacing scale | None (rely on Tailwind defaults) | Custom `--space-*` token family | Current usage doesn't yet justify the abstraction; revisit if visual inconsistency appears. [inferred] |
| Motion easing default | `ease` (CSS keyword) | Cubic-bezier from a curated set | Simple and good-enough for state transitions; bespoke bezier reserved for the progress-bar fill. [inferred] |
| Prefers-reduced-motion handling | None today (gap) | Global animation/transition suppression rule | Will be added in the cascade from `DSYS-MOTION-002`. |
| Token reference mechanism | Tailwind utility classes (`bg-primary`, `text-ink`, `rounded-md`) | Inline `style` with `var(--…)` references; inline `style` with literal `oklch(…)` values | Utility classes survive token renames at the build layer and stay grep-discoverable. Literal values bypass both. Positional/computed inline styles (`left`, `transform`) are still allowed. |

## Open Questions

### Resolved
1. ✅ Two-layer split (values vs behavior).
2. ✅ Single oklch light theme for v1, dark mode deferred.
3. ✅ Parallel-overlay arrow placement.

### Deferred
1. **Dark mode value-swap implementation** — token names already accommodate it.
2. **`--space-*` token family** — adopt only when ad-hoc Tailwind spacing produces visible drift.
3. **`prefers-reduced-motion` global rule** — required by `DSYS-MOTION-002` (forthcoming); implementation deferred to the spec cascade.
4. **Per-club theming** — out of v1 scope; would require theme tokens to be DOM-scoped rather than `:root`-scoped.
5. **Token export pipeline** — generating `tokens.json` for designers (Figma plugin consumption) is a possible future, not committed.

## References

- `src/app/globals.css` — the runtime artifact (token values).
- `docs/bookclub-hub-designs/project/primitives.jsx` — visual reference for all primitives.
- `docs/llds/components-button.md` — first per-primitive LLD; uses this LLD's contracts.
- `docs/specs/dsys-specs.md` — system-wide EARS specs (forthcoming).
- `docs/high-level-design.md` — Design System section.
