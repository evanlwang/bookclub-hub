function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

interface ChapterChipProps {
  tag: string;
  chapter?: number | null;
}

// @spec DISC-API-001, DISC-DATA-001, DISC-UI-012
// @spec COMP-CHAPTER-CHIP-001..006
// Note: dynamic token reference via inline style (var(--color-chip-${idx})) is
// the LLD-documented exemption per COMP-CHAPTER-CHIP-004. The DSYS-TOOL-001
// lint selector only flags literal values, not dynamic var() references, so no
// eslint-disable is needed.
export function ChapterChip({ tag, chapter }: ChapterChipProps) {
  const validChapter = Number.isInteger(chapter) && (chapter as number) > 0;
  const idx = validChapter
    ? (((chapter as number) - 1) % 5) + 1
    : (Math.abs(hashStr(tag)) % 5) + 1;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] font-[var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.08em]"
      style={{
        background: `var(--color-chip-${idx})`,
        color: `var(--color-chip-${idx}-ink)`,
      }}
    >
      {tag}
    </span>
  );
}
