# AvatarStack

## Context and Design Philosophy

AvatarStack overlaps a list of avatars horizontally with an "+N" overflow chip. It's used in meeting availability rows (the original caller — annotated `@spec MEET-UI-008`), member rosters, and any "who's on this thing" affordance. Implementation: `src/components/ui/avatar-stack.tsx`.

## API

```ts
interface AvatarStackProps {
  names: string[];                 // ordered; first N rendered, rest collapsed into +overflow
  max?: number;                    // default: 5
  size?: "sm" | "md";              // default: "sm" — stacks are dense, so lg/xl not supported
}
```

## Layout rules

- Avatars are rendered in input order, each wrapped in a 2px `bg`-colored border ring (`border-2 border-bg`) so the underlying surface "punches through" between overlapping circles.
- After the first avatar, each subsequent avatar is shifted left by 6px (`marginLeft: -6`) producing the classic stacked-disc look.
- When `names.length > max`, an `+N` chip renders in the final slot using `bg-bg-sunken text-ink-3`, matching avatar geometry.

The 6px overlap is uniform across both `sm` (24px diameter) and `md` (32px); it produces ~75% reveal on `sm` and ~80% on `md`.

## Size constraints

Only `sm` and `md` — `lg`/`xl` avatars are too large to overlap legibly. Document: enforce via the union type, no runtime check needed.

## Visual reference

`docs/bookclub-hub-designs/project/artboards/meetings.jsx` (availability row stacks).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Overlap mechanism | Negative `margin-left` | `position: absolute` with computed `left`; CSS Grid with overlap | Negative margin is the simplest and works with flex's natural intrinsic sizing. [inferred] |
| Overlap distance | Fixed 6px | Proportional to avatar size | At `sm` and `md` (the only supported sizes) a fixed offset reads consistently. [inferred] |
| Overflow display | `+N` chip in the same slot geometry | "and N more" text; popover with full list | Same-geometry chip preserves visual rhythm; full list is a future enhancement. [inferred] |
| Border ring | `border-2 border-bg` | No border; `--color-line` border | Page-background border lets the stack "cut out" the avatars cleanly on any surface. [inferred] |
| Size cap | `sm`/`md` only | All four sizes | Larger sizes don't overlap legibly; restrict at the type level. [inferred] |

## Open Questions

### Resolved
1. ✅ Two sizes, +N overflow, fixed overlap.
2. ✅ `border-bg` ring carries from the surface beneath.

### Deferred / Active gaps
1. **Hover tooltip on each avatar** showing the full name — useful when the visible name is just initials. Not committed.
2. **Overflow click → popover** with the full list. Not committed.
3. **Order semantics**. Today the caller passes `names` in display order. A future enhancement might re-sort (alphabetical, viewer-first, recently-active-first); should be opt-in to preserve current behavior.

## References

- `src/components/ui/avatar-stack.tsx` — implementation (carries `@spec MEET-UI-008`).
- `src/components/ui/avatar.tsx` — composed primitive.
- `docs/llds/components-avatar.md` — sibling LLD.
- `docs/specs/comp-avatar-stack-specs.md` — forthcoming.
