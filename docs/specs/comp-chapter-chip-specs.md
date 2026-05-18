# ChapterChip Component Specs

**LLD**: docs/llds/components-chapter-chip.md
**Implementing artifacts**:
- Component: `src/components/ui/chapter-chip.tsx` (also annotated `@spec DISC-API-001, DISC-DATA-001, DISC-UI-012`)
- Tests: forthcoming (`tests/unit/components/chapter-chip.test.tsx`)

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## API

- `[x]` **COMP-CHAPTER-CHIP-001**: The ChapterChip primitive SHALL accept `tag` (required string) and `chapter` (optional `number | null`).

## Color Picker

- `[x]` **COMP-CHAPTER-CHIP-002**: When `chapter` is a positive integer ≥ 1, the color index SHALL be `((chapter - 1) % 5) + 1`, so chapter 1 → chip-1, chapter 2 → chip-2, etc.
- `[ ]` **COMP-CHAPTER-CHIP-003**: When `chapter` is `null`, `undefined`, zero, negative, fractional, or `NaN`, the color index SHALL fall through to the tag-hash path: `(Math.abs(hashStr(tag)) % 5) + 1`, so the same `tag` always picks the same color. Active gap — current implementation routes by `chapter != null` only, so `chapter = 0` produces an invalid index 0 (no `--color-chip-0` token) and `chapter = -3` similarly diverges.

## Token Application

- `[x]` **COMP-CHAPTER-CHIP-004**: The primitive SHALL apply `{ background: var(--color-chip-{idx}), color: var(--color-chip-{idx}-ink) }` via inline `style`. This SHALL be the LLD-documented exemption to `DSYS-TOKEN-003` because the index is computed at render time and cannot be statically resolved by Tailwind.

## Shape & Typography

- `[x]` **COMP-CHAPTER-CHIP-005**: The chip SHALL render with `font-family: var(--font-mono)`, `font-size: 11px`, `font-weight: 500`, `border-radius: var(--radius-sm)`, `padding: 2px 8px`, `inline-flex`.

## Accessibility

- `[x]` **COMP-CHAPTER-CHIP-006**: The chip's color SHALL be decorative; the `tag` text SHALL carry all semantic meaning so screen readers receive the chapter information from text alone (no `aria-label` or color-name announcement).

## Deferred

- `[D]` **COMP-CHAPTER-CHIP-007**: `title` attribute showing the full chapter range for truncated tags.
- `[D]` **COMP-CHAPTER-CHIP-008**: Expanded chip palette (>5 colors) for books with 30+ chapters where adjacent-chapter collisions become more visible.
