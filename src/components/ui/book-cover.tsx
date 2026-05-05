type CoverVariant = "teal" | "rust" | "sage" | "mauve" | "amber" | "ink";
type CoverSize = "sm" | "md" | "lg" | "xl";

const variantGradients: Record<CoverVariant, string> = {
  teal: "from-[oklch(0.55_0.07_195)] to-[oklch(0.32_0.06_215)]",
  rust: "from-[oklch(0.62_0.12_35)] to-[oklch(0.40_0.09_25)]",
  sage: "from-[oklch(0.62_0.06_145)] to-[oklch(0.40_0.05_155)]",
  mauve: "from-[oklch(0.55_0.08_320)] to-[oklch(0.32_0.07_310)]",
  amber: "from-[oklch(0.78_0.13_75)] to-[oklch(0.55_0.10_60)]",
  ink: "from-[oklch(0.32_0.02_250)] to-[oklch(0.18_0.015_250)]",
};

const dims: Record<CoverSize, { w: number; h: number; t: number; a: number }> =
  {
    sm: { w: 48, h: 70, t: 9, a: 7 },
    md: { w: 80, h: 116, t: 13, a: 9 },
    lg: { w: 132, h: 192, t: 18, a: 11 },
    xl: { w: 180, h: 260, t: 22, a: 13 },
  };

interface BookCoverProps {
  title: string;
  author: string;
  variant?: CoverVariant;
  size?: CoverSize;
}

export function BookCover({
  title,
  author,
  variant = "teal",
  size = "md",
}: BookCoverProps) {
  const d = dims[size];
  return (
    <div
      className={`relative rounded-sm overflow-hidden shrink-0 bg-gradient-to-br ${variantGradients[variant]} text-white`}
      style={{
        width: d.w,
        height: d.h,
        boxShadow:
          "inset 2px 0 0 oklch(0.4 0.05 30 / 0.12), inset -1px 0 0 oklch(1 0 0 / 0.2), 0 4px 12px -4px oklch(0.3 0.05 30 / 0.3)",
      }}
    >
      {/* Spine line */}
      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-[oklch(0.4_0.05_30/0.15)]" />
      <div
        className="absolute inset-0 flex flex-col justify-between font-[var(--font-display)]"
        style={{ padding: "12% 14% 12% 18%" }}
      >
        <div
          className="font-semibold leading-tight tracking-tight"
          style={{ fontSize: d.t }}
        >
          {title}
        </div>
        <div
          className="opacity-78 italic uppercase tracking-widest"
          style={{ fontSize: d.a }}
        >
          {author}
        </div>
      </div>
    </div>
  );
}
