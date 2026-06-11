// @spec VOTE-UI-EARGLYPH-001 — tiny folded-corner square; N of them filling up
// is the "2/3 dog-eared" picks indicator (cozy redesign).
export function EarGlyph({ filled, size = 16 }: { filled: boolean; size?: number }) {
  const fold = Math.round(size * 0.55);
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block overflow-hidden rounded-[3px] transition-colors duration-200 ${
        filled ? "bg-primary-soft" : "bg-bg-sunken"
      }`}
      style={{ width: size, height: size }}
    >
      {filled && (
        <span
          className="absolute top-0 right-0 w-0 h-0 border-t-primary"
          style={{
            borderTopWidth: fold,
            borderTopStyle: "solid",
            borderLeftWidth: fold,
            borderLeftStyle: "solid",
            borderLeftColor: "transparent",
          }}
        />
      )}
    </span>
  );
}
