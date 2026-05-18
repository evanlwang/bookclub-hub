# Badge

## Context and Design Philosophy

Badge is an inline status pill — small, low-attention, used to label state ("Live", "Decided", "Awaiting responses") and role ("Owner", "Admin"). It is *not* a button; it never carries pointer interaction. Consult `docs/llds/design-system.md` for token taxonomy. Implementation: `src/components/ui/badge.tsx`.

## API

```ts
interface BadgeProps {
  tone?: "neutral" | "primary" | "accent" | "success" | "warning" | "danger";  // default: "neutral"
  dot?: boolean;     // small leading indicator dot
  children: ReactNode;
}
```

Renders as an inline `<span>`. No `aria-*` set by default — callers add `aria-label` if the badge is the only label for a status.

## Tone × token map

Every tone applies a `-soft` background paired with a contrasting foreground. The `dot` is `bg-current` at `opacity: 85%`, so it always matches the foreground tone.

| Tone | Background | Foreground |
|------|------------|------------|
| `neutral` | `--color-bg-sunken` | `--color-ink-2` |
| `primary` | `--color-primary-soft` | `--color-primary-ink` |
| `accent` | `--color-accent-soft` | `--color-accent-ink` |
| `success` | `--color-success-soft` | `--color-success` |
| `warning` | `--color-warning-soft` | **literal `oklch(0.45 0.10 70)`** *(gap — no `--color-warning-ink` token)* |
| `danger` | `--color-danger-soft` | `--color-danger` |

Shape: `text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5`. No size variants — badges are intentionally one-size.

## Visual reference

`docs/bookclub-hub-designs/project/artboards/design-system.jsx` (Badges section).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Tone count | 6 (neutral + 5 semantic/brand) | 3 (neutral, brand, danger only); per-feature variants | Covers every observed use; matches the system token palette one-to-one. [inferred] |
| Background style | `-soft` tint (low contrast) | Solid like Button | Badges are quiet; solid would compete with primary CTAs. [inferred] |
| Size variants | None | `sm` / `md` | One size keeps badges visually consistent across pages. [inferred] |
| Dot indicator | Optional, inherits `currentColor` at 85% opacity | Always-on; configurable color | Optional keeps the default minimal; `currentColor` couples the dot to the tone automatically. [inferred] |
| `warning` foreground | Hard-coded `oklch(0.45 0.10 70)` *(gap)* | Add `--color-warning-ink` token; reuse `--color-warning` | Foreground was picked for legibility on `--color-warning-soft`. Should be promoted to a token to match the `primary`/`accent` shape. |

## Open Questions

### Resolved
1. ✅ Six tones, one size.
2. ✅ Inline `<span>` rendering (not a button).

### Deferred / Active gaps
1. **`--color-warning-ink` token missing.** Badge inlines a literal oklch value for warning foreground. Add the token to `globals.css` and reference it via a `text-warning-ink` utility class to close the inline-literal gap.
2. **`aria-label` guidance.** When a badge stands alone (no surrounding label), screen readers receive only the children text. A spec should require callers to provide `aria-label` when the visual context makes the meaning ambiguous.
3. **Outline variant.** Some surfaces (`bg-bg-sunken` already-tinted backgrounds) would benefit from an outlined badge variant rather than the `-soft` tint, which becomes hard to see. Not committed.

## References

- `src/components/ui/badge.tsx` — implementation.
- `docs/llds/design-system.md` — token taxonomy.
- `docs/specs/comp-badge-specs.md` — forthcoming.
