# Button

## Context and Design Philosophy

Button is the most-used primitive in the system. It has five semantic variants (`primary`, `secondary`, `ghost`, `danger`, `accent`) crossed with three sizes (`sm`, `md`, `lg`) and four states (`default`, `hover`, `disabled`, `loading`). Default is `secondary` size `md` — unknown buttons should not claim primary attention.

Variants are **semantic**, not visual: callers say "this is destructive" (`danger`), not "this is red." This insulates pages from token tweaks and keeps the variant matrix small enough to memorize.

Consult `docs/llds/design-system.md` for the token taxonomy, focus contract, and motion contract this LLD assumes. Implementation: `src/components/ui/button.tsx`.

## API

```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";  // default: "secondary"
  size?: "sm" | "md" | "lg";                                          // default: "md"
  icon?: ReactNode;       // left icon; replaced by spinner when loading
  iconRight?: ReactNode;  // right icon; always rendered
  loading?: boolean;      // shows spinner, sets disabled
}
```

All native `<button>` attributes (including `onClick`, `aria-*`) pass through. **`type` defaults to `"button"`** in the primitive — callers must opt into `type="submit"` explicitly. This prevents the long-standing browser footgun where a `<button>` inside a `<form>` silently submits on click.

## Variant × State token map

States: `default → hover → disabled → loading`. Priority `disabled > loading > hover > default`. `loading` implies `disabled` (no clicks, no hover). Focus (the global `:focus-visible` ring on `--color-primary`) is orthogonal — applied on top of any state.

| Variant | Default bg / fg / border | Hover delta | Disabled | Loading |
|---------|--------------------------|-------------|----------|---------|
| `primary` | `--color-primary` / `--color-bg` / — | bg → `--color-primary-hover` | `opacity: 0.5`, no pointer events | spinner replaces `icon`, button `disabled` |
| `secondary` | `--color-bg` / `--color-ink` / `--color-line-strong` | bg → `--color-bg-soft`, border → `--color-ink-4` | (same) | (same) |
| `ghost` | transparent / `--color-ink-2` / — | bg → `--color-bg-sunken`, fg → `--color-ink` | (same) | (same) |
| `danger` | `--color-danger` / white / — | `filter: brightness(0.93)` *[inferred — no `--color-danger-hover` token exists]* | (same) | (same) |
| `accent` | `--color-accent` / `--color-ink` / — | `filter: brightness(0.96)` *[inferred — no `--color-accent-hover` token exists]* | (same) | (same) |

All variants share `border-radius: var(--radius-md)`, `font-weight: 500`, and `transition: all 150ms ease`.

## Size matrix

| Size | Height | Padding (X / Y) | Font size |
|------|--------|-----------------|-----------|
| `sm` | 30px | 12px / 6px | 13px |
| `md` | 38px | 16px / 8px | 14px |
| `lg` | 46px | 20px / 10px | 15px |

`gap: 8px` between `icon`, `children`, and `iconRight` regardless of size.

## Loading behavior

When `loading` is true:
- `icon` is replaced by a 16×16px spinner (`animate-spin`, currentColor stroke).
- `children` and `iconRight` continue to render — text does not shift because the spinner occupies the same slot as `icon`.
- The native `disabled` attribute is set (clicks suppressed).
- `aria-busy="true"` is **not** currently set — open gap (`COMP-BUTTON-A11Y-001`).

When `loading` is false and `icon` is provided, `icon` renders normally.

## Disabled behavior

Visual: `opacity: 0.5`, `cursor: not-allowed`. Programmatic: native `disabled` attribute is set (so the button is removed from the tab order and click events are suppressed by the browser). `aria-disabled` is **not** explicitly set — open gap. Disabled overrides hover for all variants.

## Visual reference

The canonical visual rendering of all variant/size/state combinations is in `docs/bookclub-hub-designs/project/artboards/design-system.jsx` (Buttons section). The implementation in `src/components/ui/button.tsx` is the runtime reference; the artboard is the visual reference. When they disagree, file a spec ticket — don't drift either side silently.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Variant axis | Semantic (`primary`, `danger`, …) | Color-only (`teal`, `red`); intent flags (`isPrimary`, `isDestructive`) | Semantic names insulate callers from token churn and keep the matrix discoverable. [inferred] |
| Default variant | `secondary` | `primary` | Unknown buttons shouldn't claim primary attention; `secondary` is the safe default. [inferred] |
| Size count | 3 (`sm`, `md`, `lg`) | 2 (`md`, `lg`); 4 (`xs`, `sm`, `md`, `lg`) | Three covers inline density, body forms, and CTAs; more sizes invite indecision. [inferred] |
| Hover for `danger` / `accent` | `filter: brightness()` | Dedicated `--color-danger-hover` / `--color-accent-hover` tokens | Brightness keeps token surface small but creates asymmetry with `primary` (which *does* have `-hover`). Worth revisiting. [inferred] |
| Loading icon swap | Spinner replaces `icon`, `children` stays | Spinner overlays the whole button; separate `loadingText` prop | Width-stable transition between idle and loading; no flicker. [inferred] |
| Focus indicator | Inherit global `:focus-visible` | Per-variant focus rings | One source of truth; works on every variant including solid `primary` backgrounds. |
| `aria-busy` / `aria-disabled` | Not currently set (gap) | Set on `loading` / `disabled` | Open accessibility gap — see `COMP-BUTTON-A11Y-001`. |
| Default `type` attribute | `"button"` | Inherit browser default (`"submit"` inside forms) | Safer default. Form-submit buttons opt in via explicit `type="submit"`. Eliminates the browser footgun of `<button>` inside `<form>` submitting on click. |

## Open Questions

### Resolved
1. ✅ Five variants, three sizes, four states (priority `disabled > loading > hover > default`).
2. ✅ Loading state implies disabled.
3. ✅ Focus is global; not re-implemented per variant.

### Deferred / Active gaps
1. **`aria-busy="true"` when `loading`** — accessibility gap; covered by a forthcoming `COMP-BUTTON-A11Y-001` spec.
2. **`aria-disabled="true"` mirror of native `disabled`** — same forthcoming spec.
3. **Hover asymmetry** — `primary` uses `--color-primary-hover`; `danger`/`accent` use `filter: brightness()`. Pick one and align (likely: add `--color-danger-hover` and `--color-accent-hover`, drop the filter).
4. **Active / pressed state** — no `:active` styling today. Likely fine for v1 but worth a spec to make the omission explicit.
5. **Icon-only variant** — current implementation renders icon + (empty children) but produces a non-square button with text padding. A dedicated `iconOnly` size or component is open.
6. **`brightness-93` Tailwind class** — relies on Tailwind v4 arbitrary value handling; confirm class compiles correctly under the project's Tailwind config.
7. **`text-bg` on primary** — the primary variant uses `text-bg` (which resolves to `--color-bg`, near-white). Verify WCAG AA contrast on `--color-primary` (teal) — should pass but worth an assertion.

## References

- `src/components/ui/button.tsx` — implementation.
- `docs/llds/design-system.md` — system-wide token, focus, motion contracts.
- `docs/bookclub-hub-designs/project/primitives.jsx` — visual reference.
- `docs/specs/comp-button-specs.md` — EARS specs (forthcoming).
