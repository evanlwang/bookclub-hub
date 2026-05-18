# Card

## Context and Design Philosophy

Card is the structural container that groups related content into a visually distinct surface (dashboard cards, hero cards, list cards, empty states). It is intentionally **minimal** — Card brings the surface, border, radius, and elevation; everything else (padding, layout, content) is the caller's job. Consult `docs/llds/design-system.md` for token taxonomy. Implementation: `src/components/ui/card.tsx`.

## API

```ts
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

All native `<div>` attributes pass through (including `className`, `onClick`, `data-testid`, ARIA). Card has no `padding` prop — callers add `p-4`, `p-6`, etc. via `className`.

## Token map

| Property | Token |
|----------|-------|
| Background | `--color-bg` |
| Border | `1px solid --color-line` |
| Border-radius | `--radius-lg` |
| Shadow | `--shadow-sm` |

No hover, focus, or pressed state. Card is a surface, not an interactive element. If a card needs to be clickable, wrap its contents in a `<Link>` or `<button>` (which carries its own focus ring).

## Visual reference

`docs/bookclub-hub-designs/project/artboards/dashboard.jsx` and `voting.jsx` show Card in heavy use (three-column grid, hero card, empty states).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Padding | None (caller supplies) | Fixed default (`p-4`); a `padding` prop with `sm`/`md`/`lg` | Padding varies wildly across usages (hero, empty state, list row); a default would be wrong half the time. [inferred] |
| Hover state | None | Subtle shadow elevation on hover | Cards are not interactive by default; making them appear so misleads users. [inferred] |
| Variants | None | `flat` / `elevated` / `outlined` | One shape keeps composition simple; visual differentiation comes from content, not from card chrome. [inferred] |
| Border radius | `--radius-lg` (14px) | `--radius-md` (10px); no radius | Larger radius reads as "softer surface," matching the warm-paper aesthetic. [inferred] |

## Open Questions

### Resolved
1. ✅ One shape, no padding default, no hover.
2. ✅ Passes through all native div attributes.

### Deferred / Active gaps
1. **`as` prop for semantic element**. Some "cards" are actually `<article>` or `<section>` semantically. A future `as` prop or a `CardArticle` companion could improve a11y. Not committed.
2. **Interactive-card wrapping pattern**. No documented pattern for "clickable card" — callers currently wrap with `<Link>` and accept that the entire card surface is the click target. A spec or recipe would prevent reinvention.

## References

- `src/components/ui/card.tsx` — implementation.
- `docs/llds/design-system.md` — token taxonomy.
- `docs/specs/comp-card-specs.md` — forthcoming.
