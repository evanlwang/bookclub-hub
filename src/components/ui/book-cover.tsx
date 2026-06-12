// @spec COMP-BOOK-COVER-001..011, COMP-BOOK-COVER-014
/* eslint-disable no-restricted-syntax -- COMP-BOOK-COVER-010: cloth-bound metaphor is the documented exemption from DSYS-TOKEN-003 */
// Client component: the photo path tracks an onError state so failed covers
// swap to the typographic fallback (COMP-BOOK-COVER-011).
"use client";

import { useState } from "react";
// Cozy redesign: six warm cloth-bound variants (no cool tones). Each is a
// palette: deep cloth, lifted highlight, cream foil ink, mid rule.
type CoverVariant =
  | "rust"
  | "olive"
  | "terracotta"
  | "bronze"
  | "clay"
  | "sienna";
type CoverSize = "sm" | "md" | "lg" | "xl";

const variants: Record<
  CoverVariant,
  { base: string; lift: string; foil: string; rule: string }
> = {
  rust: {
    base: "oklch(0.42 0.10 35)",
    lift: "oklch(0.55 0.12 38)",
    foil: "oklch(0.93 0.04 82)",
    rule: "oklch(0.82 0.06 78 / 0.55)",
  },
  olive: {
    base: "oklch(0.45 0.06 128)",
    lift: "oklch(0.58 0.07 126)",
    foil: "oklch(0.94 0.03 100)",
    rule: "oklch(0.82 0.05 100 / 0.55)",
  },
  terracotta: {
    base: "oklch(0.50 0.12 40)",
    lift: "oklch(0.62 0.13 42)",
    foil: "oklch(0.95 0.04 85)",
    rule: "oklch(0.86 0.06 80 / 0.55)",
  },
  bronze: {
    base: "oklch(0.45 0.06 75)",
    lift: "oklch(0.58 0.08 78)",
    foil: "oklch(0.94 0.035 92)",
    rule: "oklch(0.82 0.05 88 / 0.55)",
  },
  clay: {
    base: "oklch(0.52 0.07 50)",
    lift: "oklch(0.64 0.09 55)",
    foil: "oklch(0.95 0.035 85)",
    rule: "oklch(0.85 0.05 80 / 0.55)",
  },
  sienna: {
    base: "oklch(0.44 0.09 45)",
    lift: "oklch(0.56 0.11 48)",
    foil: "oklch(0.93 0.04 82)",
    rule: "oklch(0.83 0.06 78 / 0.55)",
  },
};

const order: CoverVariant[] = [
  "rust",
  "olive",
  "terracotta",
  "bronze",
  "clay",
  "sienna",
];

// FNV-1a-ish stable hash → deterministic palette per title. Same book renders
// in the same color across the app, but different books get different colors.
function pickVariant(title: string): CoverVariant {
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return order[h % order.length];
}

const dims: Record<
  CoverSize,
  { w: number; h: number; t: number; a: number; pad: number; band: number }
> = {
  sm: { w: 48, h: 70, t: 9, a: 7, pad: 6, band: 1 },
  md: { w: 80, h: 116, t: 13, a: 9, pad: 10, band: 1.5 },
  lg: { w: 132, h: 192, t: 19, a: 11, pad: 16, band: 2 },
  xl: { w: 180, h: 260, t: 24, a: 13, pad: 22, band: 2.5 },
};

interface BookCoverProps {
  title: string;
  author: string;
  coverUrl?: string | null;
  /** Fallback image source when no coverUrl is stored (COMP-BOOK-COVER-014). */
  isbn?: string | null;
  variant?: CoverVariant;
  size?: CoverSize;
}

// @spec COMP-BOOK-COVER-014
// `default=false` makes Open Library 404 on unknown ISBNs instead of serving
// a blank 1×1 image — the 404 fires the <img> onError, which flips to the
// cloth fallback. Mirrors the design handoff's DgBookCover.
function olCoverUrl(isbn: string): string | null {
  const normalized = isbn.replace(/[^0-9Xx]/g, "");
  if (!normalized) return null;
  return `https://covers.openlibrary.org/b/isbn/${normalized}-M.jpg?default=false`;
}

export function BookCover({
  title,
  author,
  coverUrl,
  isbn,
  variant,
  size = "md",
}: BookCoverProps) {
  // @spec COMP-BOOK-COVER-011 — failed photo loads fall back to cloth.
  const [imageFailed, setImageFailed] = useState(false);
  const v = variants[variant ?? pickVariant(title)];
  const d = dims[size];
  const imageUrl = coverUrl ?? (isbn ? olCoverUrl(isbn) : null);

  // Outer envelope shared by image + typographic paths so both feel like the
  // same physical object: same proportions, same drop, same edge highlight.
  const envelope: React.CSSProperties = {
    width: d.w,
    height: d.h,
    boxShadow: [
      // edge highlight (top)
      "inset 0 1px 0 oklch(1 0 0 / 0.18)",
      // edge shadow (bottom)
      "inset 0 -1px 0 oklch(0 0 0 / 0.28)",
      // page-block hint along the right edge
      "inset -1px 0 0 oklch(1 0 0 / 0.10)",
      // ambient drop
      `0 ${size === "sm" ? 2 : 6}px ${size === "sm" ? 6 : 18}px -${size === "sm" ? 2 : 6}px oklch(0.12 0.02 60 / 0.45)`,
    ].join(", "),
  };

  if (imageUrl && !imageFailed) {
    return (
      <div
        className="relative rounded-[2px] overflow-hidden shrink-0 bg-[oklch(0.22_0.01_60)]"
        style={envelope}
        aria-label={`${title} by ${author}`}
      >
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        {/* Spine sliver — a faint vertical band on the left edge keeps the
            bound-book feel even when the artwork is photographic. */}
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: Math.max(2, d.pad * 0.18),
            background:
              "linear-gradient(90deg, oklch(0 0 0 / 0.35), oklch(0 0 0 / 0))",
          }}
        />
        {/* Subtle inner border to read as a finished edge against any bg */}
        <div className="absolute inset-0 pointer-events-none rounded-[2px] ring-1 ring-inset ring-black/20" />
      </div>
    );
  }

  // Typographic fallback: cloth-bound, foil-stamped feel.
  const titleSpaceTop = d.pad * 1.4;
  const titleSpaceBottom = d.pad * 1.2;
  const ruleThickness = Math.max(0.5, d.band * 0.4);
  const showOrnament = size !== "sm";

  return (
    <div
      className="relative rounded-[2px] overflow-hidden shrink-0"
      style={{
        ...envelope,
        // Layered radial + linear gradients = "cloth" depth without raster textures.
        backgroundImage: [
          // top-left highlight (where light catches the cloth weave)
          `radial-gradient(120% 80% at 15% 0%, ${v.lift} 0%, transparent 55%)`,
          // bottom-right shadow pool
          `radial-gradient(120% 90% at 100% 100%, oklch(0 0 0 / 0.32) 0%, transparent 60%)`,
          // base cloth color
          `linear-gradient(180deg, ${v.base}, ${v.base})`,
        ].join(", "),
        color: v.foil,
      }}
      aria-label={`${title} by ${author}`}
    >
      {/* Spine: three raised bands on the left edge, like a hardcover binding. */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{ width: d.pad * 0.7 }}
      >
        <div
          className="absolute inset-y-0 right-0 w-px"
          style={{ background: "oklch(0 0 0 / 0.35)" }}
        />
        <div
          className="absolute inset-y-0 right-px"
          style={{
            width: d.band,
            background:
              "linear-gradient(90deg, oklch(1 0 0 / 0.07), oklch(0 0 0 / 0.12))",
          }}
        />
        {[0.28, 0.5, 0.72].map((y) => (
          <div
            key={y}
            className="absolute left-0 right-px"
            style={{
              top: `${y * 100}%`,
              height: ruleThickness * 2,
              background: `linear-gradient(180deg, oklch(0 0 0 / 0.25), ${v.rule}, oklch(0 0 0 / 0.25))`,
            }}
          />
        ))}
      </div>

      {/* Foil-stamped content tablet, framed by double rules. */}
      <div
        className="absolute inset-0 flex flex-col font-[var(--font-display)]"
        style={{
          paddingTop: titleSpaceTop,
          paddingBottom: titleSpaceBottom,
          paddingLeft: d.pad * 1.6,
          paddingRight: d.pad * 1.1,
        }}
      >
        {/* Top double rule */}
        <div className="mb-auto">
          <div
            style={{
              height: ruleThickness,
              background: v.rule,
              opacity: 0.95,
            }}
          />
          <div
            style={{
              height: ruleThickness,
              marginTop: ruleThickness + 1,
              background: v.rule,
              opacity: 0.55,
            }}
          />
        </div>

        {/* Title — foil-stamped. Subtle text-shadow gives an inset/emboss feel. */}
        <div
          className="font-semibold leading-[1.05]"
          style={{
            fontSize: d.t,
            letterSpacing: "-0.005em",
            textShadow:
              "0 1px 0 oklch(0 0 0 / 0.35), 0 -0.5px 0 oklch(1 0 0 / 0.08)",
          }}
        >
          {title}
        </div>

        {showOrnament && (
          <div
            className="flex items-center gap-1.5 my-2"
            aria-hidden="true"
            style={{ color: v.rule }}
          >
            <span style={{ flex: 1, height: ruleThickness, background: "currentColor", opacity: 0.7 }} />
            <span
              style={{
                width: d.band * 2,
                height: d.band * 2,
                borderRadius: "999px",
                background: "currentColor",
                opacity: 0.85,
              }}
            />
            <span style={{ flex: 1, height: ruleThickness, background: "currentColor", opacity: 0.7 }} />
          </div>
        )}

        {/* Author — small caps, generous tracking, set on its own line. */}
        <div
          className="mt-auto italic"
          style={{
            fontSize: d.a,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.85,
            textShadow: "0 1px 0 oklch(0 0 0 / 0.25)",
          }}
        >
          {author}
        </div>

        {/* Bottom double rule */}
        <div className="mt-2">
          <div
            style={{
              height: ruleThickness,
              background: v.rule,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              height: ruleThickness,
              marginTop: ruleThickness + 1,
              background: v.rule,
              opacity: 0.95,
            }}
          />
        </div>
      </div>

      {/* Very faint cloth-weave overlay — diagonal lines layered at low opacity. */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, oklch(1 0 0 / 0.5) 0 0.5px, transparent 0.5px 2px), repeating-linear-gradient(-45deg, oklch(0 0 0 / 0.5) 0 0.5px, transparent 0.5px 2px)",
        }}
      />
    </div>
  );
}
