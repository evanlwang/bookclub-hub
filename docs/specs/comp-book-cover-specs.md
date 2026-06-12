# BookCover Component Specs

**LLD**: docs/llds/components-book-cover.md
**Implementing artifacts**:
- Component: `src/components/ui/book-cover.tsx`
- Tests: `tests/unit/components/book-cover.test.tsx`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-BOOK-COVER-001**: The BookCover primitive SHALL accept `title` (required), `author` (required), `coverUrl` (optional string | null), `isbn` (optional string | null — fallback image source, see COMP-BOOK-COVER-014), `variant ∈ {teal, rust, sage, mauve, amber, ink}` (optional), and `size ∈ {sm, md, lg, xl}` (default `md`).

## Variant Pick

- `[x]` **COMP-BOOK-COVER-002**: When `variant` is not provided, the primitive SHALL pick a variant deterministically from `title` via an FNV-1a-style hash modulo 6 — the same title always picks the same variant.
- `[x]` **COMP-BOOK-COVER-003**: When `variant` is provided, the primitive SHALL use the explicit variant without consulting the hash.

## Render Paths

- `[x]` **COMP-BOOK-COVER-004**: When `coverUrl` is provided, the primitive SHALL render an `<img>` inside a hardcover envelope with drop shadow, left-edge spine sliver, and inset ring border.
- `[x]` **COMP-BOOK-COVER-005**: When no image URL is resolvable (no `coverUrl`, no `isbn` — see COMP-BOOK-COVER-014) or the image failed to load (COMP-BOOK-COVER-011), the primitive SHALL render a typographic cloth-bound fallback using the variant's `{base, lift, foil, rule}` palette with title (foil-stamped), author (small-caps italic), top and bottom double rules, and an optional central ornament.

## Size Geometry

- `[x]` **COMP-BOOK-COVER-006**: Every size SHALL render at the dimensions in the LLD's size matrix (`sm` 48×70, `md` 80×116, `lg` 132×192, `xl` 180×260) — a ~0.68 aspect ratio in every case.
- `[x]` **COMP-BOOK-COVER-007**: At size `sm`, the typographic fallback SHALL omit the central ornament; at `md`, `lg`, and `xl` it SHALL render it.

## Accessibility

- `[x]` **COMP-BOOK-COVER-008**: The primitive SHALL set `aria-label="{title} by {author}"` on the outer envelope.
- `[x]` **COMP-BOOK-COVER-009**: When `coverUrl` is provided, the `<img>`'s `alt` SHALL be the empty string so the outer `aria-label` is the single screen-reader announcement.

## Token Discipline

- `[x]` **COMP-BOOK-COVER-010**: BookCover SHALL be exempt from `DSYS-TOKEN-003` for **all inline-style values that render the cloth-bound book metaphor**: the six variant palettes (`{base, lift, foil, rule}`), layered radial and linear gradients, envelope drop shadows, edge highlights, spine raised-band rules, weave overlay, and foil-stamped title/author `text-shadow` values. These values are component-private and SHALL NOT be promoted to the global token set. Non-cover styling (layout utilities, positioning, generic radii like `rounded-[2px]`) SHALL go through tokens.

## Image Fallback Chain

- `[x]` **COMP-BOOK-COVER-014**: WHEN `coverUrl` is null/undefined AND `isbn` is provided, the primitive SHALL derive the photo-path URL as `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg?default=false` (ISBN normalized by stripping non-alphanumerics; `default=false` makes Open Library 404 on missing covers instead of serving a blank image, so the error path triggers). A stored `coverUrl` always wins over derivation.
- `[x]` **COMP-BOOK-COVER-011**: WHEN the photo-path `<img>` fires `onError`, the primitive SHALL swap to the typographic cloth-bound fallback (COMP-BOOK-COVER-005). Requires a client boundary (`"use client"` + failed-image state, mirroring the design handoff's `DgBookCover`). *(Un-deferred 2026-06-11 alongside COMP-BOOK-COVER-014 — derivation without an error fallback would render broken images for ISBN-less or uncovered books.)*

## Deferred
- `[D]` **COMP-BOOK-COVER-012**: Spine text for `lg`/`xl` variants (title rendered vertically on the spine).
- `[D]` **COMP-BOOK-COVER-013**: Image priority/preload hints for cover grids (e.g., nomination lists).
