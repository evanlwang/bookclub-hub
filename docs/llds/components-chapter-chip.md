# ChapterChip

## Context and Design Philosophy

ChapterChip is a small monospace tag used to label discussion threads with a chapter range ("Ch. 5-8", "Part 2", "Epilogue"). It's used everywhere chapter context matters — discussion lists, thread headers, compose-time chapter-mismatch warnings. The chip's color rotates through five palettes to give visual rhythm and to provide a quick chapter-to-color recall aid; the color is **decorative, not semantic** — screen readers ignore it. Implementation: `src/components/ui/chapter-chip.tsx`.

## API

```ts
interface ChapterChipProps {
  tag: string;             // label text, e.g. "Ch. 5-8"
  chapter?: number | null; // chapter number (1-based); drives color rotation
}
```

When `chapter` is provided, the color index is `((chapter - 1) % 5) + 1` so chapter 1 → chip-1, chapter 2 → chip-2, etc. When `chapter` is null/missing, a stable hash of `tag` picks a chip in the same range. Same chapter always renders in the same color; the rotation makes adjacent chapters visually distinct.

## Token map

Both background and foreground come from the global chip-palette tokens (`--color-chip-1` through `--color-chip-5` and their `-ink` companions). Token names are referenced via inline `style` because the index is dynamic — Tailwind cannot statically resolve a `bg-chip-${idx}` class string at build time. This dynamic-token-reference exception is permitted under the design-system inline-style rules (the ban targets *literal* values, not dynamic token references); call it out in the LLD so it doesn't get "fixed" later.

| Property | Value |
|----------|-------|
| Background | `var(--color-chip-{1..5})` |
| Foreground | `var(--color-chip-{1..5}-ink)` |
| Border-radius | `--radius-sm` |
| Font | `--font-mono`, 11px, medium |
| Padding | `px-2 py-0.5` |

## Visual reference

`design_handoff_dogear/app-redesign/dogear-notes.jsx` (every thread carries a chapter chip in the header).

## Spec linkage (already present)

`chapter-chip.tsx` carries `@spec DISC-API-001, DISC-DATA-001, DISC-UI-012` from the discussion-threads arrow. These remain — they record *why this primitive exists* (the discussion feature needed chapter tagging). The COMP-CHAPTERCHIP-* specs added in Phase 3 are orthogonal: they describe the primitive's own contract.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Color count | 5 | 3, 7, 12 | Five is enough to avoid adjacent-chapter color collisions for typical 10-30-chapter books, and matches the chip palette already in the design system. [inferred] |
| Color picker | `(chapter - 1) % 5` (or hash of tag when chapter missing) | Random; semantic (warm = early, cool = late); user-chosen | Deterministic + cyclic produces visual rhythm and consistency. [inferred] |
| Inline `style` for token reference | Allowed (dynamic index) | Pre-define five Tailwind classes and switch with a conditional | Pre-defining the five works but is verbose; dynamic reference is cleaner and the ban targets *literal values*, not token references. |
| Typography | Monospace, 11px | Sans, 12px | Monospace + small size reads as "tag" and visually contrasts with prose. [inferred] |
| Color is decorative | Yes (not screen-reader-announced) | Color carries meaning ("warning" / "spoiler") | The text already says "Ch. 5"; color is rhythm, not semantics. [inferred] |

## Open Questions

### Resolved
1. ✅ Five-color rotation, monospace.
2. ✅ Dynamic token reference via inline `style` (LLD-documented exception).
3. ✅ Color is decorative; meaning lives in the text.

### Deferred / Active gaps
1. **Chip count for books with 30+ chapters.** Chapters 1, 6, 11, 16... all collide on chip-1. Acceptable today but worth a spec to make the trade-off explicit.
2. **`title` attribute** showing the full chapter range on hover. Not present today; useful when the tag is truncated.
3. **Pluralization** ("Chapter" vs "Ch.") is the caller's job; the chip doesn't reformat. Document as a contract.

## References

- `src/components/ui/chapter-chip.tsx` — implementation.
- `docs/llds/design-system.md` — chip-palette tokens.
- `docs/llds/discussion-threads.md` — feature LLD that drove the primitive.
- `docs/specs/comp-chapter-chip-specs.md` — forthcoming.
