# BookCover Component Specs

**LLD**: docs/llds/components-book-cover.md
**Implementing artifacts**:
- Component: `src/components/ui/book-cover.tsx`
- Tests: forthcoming (`tests/unit/components/book-cover.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-BOOK-COVER-001**: The BookCover primitive SHALL accept `title` (required), `author` (required), `coverUrl` (optional string | null), `variant ∈ {teal, rust, sage, mauve, amber, ink}` (optional), and `size ∈ {sm, md, lg, xl}` (default `md`).

## Variant Pick

- `[x]` **COMP-BOOK-COVER-002**: When `variant` is not provided, the primitive SHALL pick a variant deterministically from `title` via an FNV-1a-style hash modulo 6 — the same title always picks the same variant.
- `[x]` **COMP-BOOK-COVER-003**: When `variant` is provided, the primitive SHALL use the explicit variant without consulting the hash.

## Render Paths

- `[x]` **COMP-BOOK-COVER-004**: When `coverUrl` is provided, the primitive SHALL render an `<img>` inside a hardcover envelope with drop shadow, left-edge spine sliver, and inset ring border.
- `[x]` **COMP-BOOK-COVER-005**: When `coverUrl` is not provided, the primitive SHALL render a typographic cloth-bound fallback using the variant's `{base, lift, foil, rule}` palette with title (foil-stamped), author (small-caps italic), top and bottom double rules, and an optional central ornament.

## Size Geometry

- `[x]` **COMP-BOOK-COVER-006**: Every size SHALL render at the dimensions in the LLD's size matrix (`sm` 48×70, `md` 80×116, `lg` 132×192, `xl` 180×260) — a ~0.68 aspect ratio in every case.
- `[x]` **COMP-BOOK-COVER-007**: At size `sm`, the typographic fallback SHALL omit the central ornament; at `md`, `lg`, and `xl` it SHALL render it.

## Accessibility

- `[x]` **COMP-BOOK-COVER-008**: The primitive SHALL set `aria-label="{title} by {author}"` on the outer envelope.
- `[x]` **COMP-BOOK-COVER-009**: When `coverUrl` is provided, the `<img>`'s `alt` SHALL be the empty string so the outer `aria-label` is the single screen-reader announcement.

## Token Discipline

- `[x]` **COMP-BOOK-COVER-010**: BookCover SHALL be exempt from `DSYS-TOKEN-003` for **all inline-style values that render the cloth-bound book metaphor**: the six variant palettes (`{base, lift, foil, rule}`), layered radial and linear gradients, envelope drop shadows, edge highlights, spine raised-band rules, weave overlay, and foil-stamped title/author `text-shadow` values. These values are component-private and SHALL NOT be promoted to the global token set. Non-cover styling (layout utilities, positioning, generic radii like `rounded-[2px]`) SHALL go through tokens.

## Deferred

- `[D]` **COMP-BOOK-COVER-011**: `<img>` `onError` fallback to the typographic path.
- `[D]` **COMP-BOOK-COVER-012**: Spine text for `lg`/`xl` variants (title rendered vertically on the spine).
- `[D]` **COMP-BOOK-COVER-013**: Image priority/preload hints for cover grids (e.g., nomination lists).
