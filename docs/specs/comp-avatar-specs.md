# Avatar Component Specs

**LLD**: docs/llds/components-avatar.md
**Implementing artifacts**:
- Component: `src/components/ui/avatar.tsx`
- Tests: forthcoming (`tests/unit/components/avatar.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API & Size Matrix

- `[x]` **COMP-AVATAR-001**: The Avatar primitive SHALL accept `size ∈ {sm, md, lg, xl}` and SHALL default to `md`.
- `[x]` **COMP-AVATAR-002**: The Avatar primitive SHALL render as a perfect circle (`rounded-full`) at the size-specific diameter — `sm` 24px, `md` 32px, `lg` 44px, `xl` 64px.

## Initial Extraction

- `[x]` **COMP-AVATAR-003**: When `src` is not provided and `name` is non-empty, the Avatar SHALL render up to 2 uppercase initials from the first character of the first two whitespace-split words of `name`.
- `[x]` **COMP-AVATAR-004**: When `src` is not provided and `name` is empty, the Avatar SHALL render `"?"` as the initial.

## Photo Path

- `[x]` **COMP-AVATAR-005**: When `src` is provided, the Avatar SHALL render an `<img>` filling the circle with `object-cover` and `alt={name}`.
- `[ ]` **COMP-AVATAR-IMG-001**: If the `<img>` load fails (`onError`), the Avatar SHALL fall back to rendering the initials path. Active gap — no `onError` handler today.

## Palette Assignment

- `[x]` **COMP-AVATAR-006**: The Avatar SHALL pick its background/foreground palette deterministically from `name` via `hashStr(name) % 5`, so the same `name` always renders in the same palette across the app.
- `[ ]` **COMP-AVATAR-TOKEN-001**: The Avatar SHALL apply its palette colors from `--color-chip-{1..5}` and `--color-chip-{1..5}-ink` tokens (one pair per index), not from hard-coded `oklch` literals. Active gap — current implementation duplicates five literal palette pairs (see `DSYS-TOKEN-003`).

## Accessibility

- `[ ]` **COMP-AVATAR-A11Y-001**: When the Avatar's `name` is already visually present next to the avatar (e.g., comment header, member row), callers SHALL be able to suppress the duplicate screen-reader announcement via an `aria-hidden` opt-in or by passing `alt=""`. Active gap — no opt-in mechanism today; screen readers receive the name twice.

## Deferred

- `[D]` **COMP-AVATAR-007**: Photo + initials hybrid render during image load (initials underlay, image fades in on load).
