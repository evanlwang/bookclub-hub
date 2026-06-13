# BookCover

## Context and Design Philosophy

BookCover renders a book at one of four sizes (`sm`/`md`/`lg`/`xl`) with one of two paths:

1. **Photo path** — when an image URL is resolvable, it renders into a `<img>` inside a hardcover-shaped envelope with a faint spine sliver and ring border. URL resolution chain: stored `coverUrl` → Open Library URL derived from `isbn` (`https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg?default=false`, COMP-BOOK-COVER-014) — mirroring the design handoff's `DgBookCover`.
2. **Typographic fallback** — when no URL resolves, *or the image fails to load* (`onError` state, COMP-BOOK-COVER-011), a procedural "cloth-bound" cover is generated from the title using one of six color variants (`teal`/`rust`/`sage`/`mauve`/`amber`/`ink`). Variant is picked deterministically by hashing the title — same book always renders in the same color.

The error fallback makes BookCover a client component (`"use client"` + failed-image state) — the same client-boundary decision flagged as open drift on `components-avatar` (COMP-AVATAR-IMG-001), resolved here for covers only.

The whole component is **the documented exception** to the design-system inline-literal ban. The cloth/foil aesthetic depends on multi-stop oklch gradients and per-variant ink colors that don't generalize to the system token palette. These values are *component-private* by design — they describe one specific physical-object metaphor and should not be shared with anything else. See `docs/llds/design-system.md § Naming conventions` ("Component-private tokens are forbidden... unless the value is genuinely unique to the component, e.g., book-cover gradients").

Implementation: `src/components/ui/book-cover.tsx`.

## API

```ts
interface BookCoverProps {
  title: string;
  author: string;
  coverUrl?: string | null;
  isbn?: string | null;     // fallback image source when coverUrl is absent
  variant?: "teal" | "rust" | "sage" | "mauve" | "amber" | "ink";  // overrides hash-pick
  size?: "sm" | "md" | "lg" | "xl";                                // default: "md"
}
```

`aria-label` is set to `"{title} by {author}"` on the outer envelope so screen readers receive a meaningful label whether the photo loads or not.

## Size matrix

Each size carries dimensions for width, height, title type-size, author type-size, padding, and spine-band width. All sizes maintain a ~0.68 aspect ratio (close to a real hardcover) and adjust shadow depth (`sm` uses a tighter, smaller drop; `lg`/`xl` use a softer, larger one).

| Size | Dimensions | Title | Author | Padding | Shadow |
|------|------------|-------|--------|---------|--------|
| `sm` | 48 × 70 | 9px | 7px | 6px | tight (0/2/6) |
| `md` | 80 × 116 | 13px | 9px | 10px | standard (0/6/18) |
| `lg` | 132 × 192 | 19px | 11px | 16px | standard |
| `xl` | 180 × 260 | 24px | 13px | 22px | standard |

## Variant palettes

Each of the six variants is a four-color cloth palette: `base` (dominant cloth color), `lift` (top-left highlight gradient), `foil` (foil-stamped text color), and `rule` (decorative double-rule lines on the cover). Five are warm-paper-adjacent (teal, rust, sage, mauve, amber); `ink` is the dark/serious variant.

Hash function: FNV-1a-ish over title characters → `% 6`. Stable per title.

## Composition layers

The typographic fallback layers, bottom-to-top:

1. **Base cloth** — linear gradient of the variant's `base` color.
2. **Top-left highlight** — radial gradient of `lift` (where light catches the cloth weave).
3. **Bottom-right shadow** — radial gradient of `oklch(0 0 0 / 0.32)` (shadow pool).
4. **Spine** — left edge column with vertical line + three raised bands.
5. **Content tablet** — top/bottom double rules framing title + ornament + author.
6. **Cloth-weave overlay** — diagonal repeating linear gradients at low opacity.

Photo path skips layers 2-3, 5-6 and replaces them with the `<img>`, but keeps the envelope, spine sliver, and inset ring.

## Visual reference

`design_handoff_dogear_redesign/dogear-voting.jsx` and `dashboard.jsx` (nominations and hero card use covers heavily).

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Component-private values | Allowed (banned everywhere else) | Promote variants to global tokens; use only the chip-palette tokens | The cloth metaphor is component-unique; promoting these to global tokens would imply they apply outside book covers, which is false. [inferred] |
| Fallback aesthetic | Cloth-bound foil-stamped | Flat color block; gradient block; emoji | Matches the warm-paper / literary aesthetic; covers feel like objects, not placeholders. [inferred] |
| Variant picker | FNV-1a hash of title `% 6` | Random; first-letter bucket; user-chooseable only | Stable per title across the app; explicit `variant` prop allows override when needed. [inferred] |
| Aspect ratio | ~0.68 (real hardcover proportion) | Square; golden ratio | Reads as "book"; flexes per size. [inferred] |
| Image alt text | Empty string (`alt=""`) with outer `aria-label` | `alt={title}` | Avoids the screen reader announcing the title twice (once for `aria-label`, once for `<img alt>`). [inferred] |
| Ornament | Hidden at `sm` | Always shown; never shown | Ornament is illegible below ~80px wide. [inferred] |
| Missing-cover detection | `?default=false` on derived OL URLs + `onError` swap | Probe with HEAD request; accept OL's blank 1×1 placeholder | OL serves a blank image for unknown ISBNs unless `default=false` forces a 404; the 404 fires `onError`, which flips to the cloth fallback. No extra round trips. |

## Open Questions

### Resolved
1. ✅ Two render paths (photo vs typographic).
2. ✅ Deterministic variant pick by title hash.
3. ✅ Component-private inline literals are an intentional exception.

### Deferred / Active gaps
1. ~~`<img>` error fallback + ISBN derivation~~ — shipped 2026-06-11 (COMP-BOOK-COVER-011/-014).
2. **Spine text** for `lg`/`xl` (title rendered vertically on the spine). Visual prototype shows it; not in the implementation.
3. **Lazy-loaded image performance** for grids of covers (e.g., nomination lists with 20+ books). `loading="lazy"` is set but no priority hints.
4. **Variant pre-warming** so a `lg` and a `sm` of the same book always pick the same variant — currently handled by the hash; document the invariant.

## References

- `src/components/ui/book-cover.tsx` — implementation.
- `docs/llds/design-system.md` — explains the component-private exception.
- `docs/specs/comp-book-cover-specs.md`
