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
export function ChapterChip({ tag, chapter }: ChapterChipProps) {
  const idx = chapter != null ? ((chapter - 1) % 5) + 1 : (Math.abs(hashStr(tag)) % 5) + 1;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] font-[var(--font-mono)] text-[11px] font-medium"
      style={{
        background: `var(--color-chip-${idx})`,
        color: `var(--color-chip-${idx}-ink)`,
      }}
    >
      {tag}
    </span>
  );
}
