# AvatarStack Component Specs

**LLD**: docs/llds/components-avatar-stack.md
**Implementing artifacts**:
- Component: `src/components/ui/avatar-stack.tsx` (also annotated `@spec MEET-UI-008`)
- Tests: forthcoming (`tests/unit/components/avatar-stack.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API & Layout

- `[x]` **COMP-AVATAR-STACK-001**: The AvatarStack primitive SHALL accept `size ∈ {sm, md}` only; `lg` and `xl` SHALL NOT be supported (enforced at the type level).
- `[x]` **COMP-AVATAR-STACK-002**: The AvatarStack primitive SHALL accept `max` (default 5); when `names.length > max`, the first `max` SHALL render as avatars and the remainder SHALL collapse into a single `+N` overflow chip.
- `[x]` **COMP-AVATAR-STACK-003**: Each avatar after the first SHALL be shifted left by `marginLeft: -6px`, producing the overlapping stacked appearance.
- `[x]` **COMP-AVATAR-STACK-004**: Each avatar (and the overflow chip) SHALL be wrapped in a `2px solid --color-bg` ring so the underlying surface punches through between overlapping circles.
- `[x]` **COMP-AVATAR-STACK-005**: While `names.length > max`, the `+N` chip SHALL render with `{ background: --color-bg-sunken, color: --color-ink-3 }` in size-specific geometry (24px at `sm`, 32px at `md`) and SHALL display the literal text `"+{N}"` where N = `names.length - max`.

## Deferred

- `[D]` **COMP-AVATAR-STACK-006**: Hover tooltip on each avatar showing the full name.
- `[D]` **COMP-AVATAR-STACK-007**: Overflow chip click → popover listing all overflow names.
- `[D]` **COMP-AVATAR-STACK-008**: Opt-in re-sort (alphabetical, viewer-first, recently-active-first).
