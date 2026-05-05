type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-11 h-11 text-[15px]",
  xl: "w-16 h-16 text-[22px]",
};

const palettes = [
  { bg: "oklch(0.92 0.04 195)", ink: "oklch(0.36 0.06 195)" },
  { bg: "oklch(0.93 0.05 75)", ink: "oklch(0.45 0.10 75)" },
  { bg: "oklch(0.92 0.045 145)", ink: "oklch(0.40 0.07 145)" },
  { bg: "oklch(0.92 0.045 320)", ink: "oklch(0.42 0.08 320)" },
  { bg: "oklch(0.92 0.05 30)", ink: "oklch(0.45 0.10 30)" },
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
}

export function Avatar({ name = "", size = "md", src }: AvatarProps) {
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
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${sizeClasses[size]}`}
      style={{ background: palette.bg, color: palette.ink }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
