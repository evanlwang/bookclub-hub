type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-11 h-11 text-[15px]",
  xl: "w-16 h-16 text-[22px]",
};

// Five palettes routed through the system chip tokens (per COMP-AVATAR-TOKEN-001).
// Same-name avatars across the app render in the same palette via hashStr below.
const palettes = [
  { bg: "var(--color-chip-1)", ink: "var(--color-chip-1-ink)" },
  { bg: "var(--color-chip-2)", ink: "var(--color-chip-2-ink)" },
  { bg: "var(--color-chip-3)", ink: "var(--color-chip-3-ink)" },
  { bg: "var(--color-chip-4)", ink: "var(--color-chip-4-ink)" },
  { bg: "var(--color-chip-5)", ink: "var(--color-chip-5-ink)" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

interface AvatarProps {
  name?: string;
  size?: AvatarSize;
  src?: string;
  decorative?: boolean;
}

// @spec COMP-AVATAR-001..007 (API, size, initials, photo, palette)
// @spec COMP-AVATAR-008, COMP-AVATAR-A11Y-001 (decorative opt-in)
// @spec COMP-AVATAR-TOKEN-001 (chip tokens, not literal oklch)
export function Avatar({ name = "", size = "md", src, decorative = false }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "?";
  const idx = Math.abs(hashStr(name)) % palettes.length;
  const palette = palettes[idx];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-[var(--font-display)] font-extrabold shrink-0 ${sizeClasses[size]}`}
      style={{ background: palette.bg, color: palette.ink }}
      aria-hidden={decorative || undefined}
    >
      {src ? (
        <img
          src={src}
          alt={decorative ? "" : name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
