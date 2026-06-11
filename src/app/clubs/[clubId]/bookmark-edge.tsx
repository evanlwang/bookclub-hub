// @spec DASH-UI-BOOKMARK-EDGE-001 — replaces the avatar-tick overlay
// (DASH-UI-HERO-TICKS-001) per the cozy-redesign divergence list.
"use client";

import { useState } from "react";

export type EdgeMember = {
  userId: string;
  name: string;
  pct: number;
  status: "reading" | "finished" | "not_started";
  chapter: number | null;
  you: boolean;
};

/**
 * The dashboard hero's page-edge bar: a horizontal striped "book edge" with a
 * terracotta median fill and one tappable bookmark per member planted at their
 * reading depth. Tapping a bookmark pops an ink tooltip ("name · ch. N").
 * Your own bookmark is terracotta, finished members get amber, others warm tan.
 */
export function BookmarkEdge({
  members,
  median,
}: {
  members: EdgeMember[];
  median: number;
}) {
  const [active, setActive] = useState<EdgeMember | null>(null);

  // Fan out bookmarks that would overlap (e.g. several members finished at
  // 100%): sort by depth, then nudge any bookmark within 4% of its neighbor
  // leftward so every one stays individually tappable.
  const placed = [...members]
    .sort((a, b) => b.pct - a.pct)
    .reduce<Array<EdgeMember & { displayPct: number }>>((acc, m) => {
      let p = Math.max(2, Math.min(97, m.pct));
      const prev = acc[acc.length - 1];
      if (prev && prev.displayPct - p < 4) p = prev.displayPct - 4;
      acc.push({ ...m, displayPct: Math.max(2, p) });
      return acc;
    }, []);

  return (
    <div className="relative pt-[30px]" data-testid="bookmark-edge">
      {/* tooltip */}
      {active && (
        <div
          key={active.userId}
          data-testid="bookmark-edge-tooltip"
          className="pointer-events-none absolute -top-2 z-[5] whitespace-nowrap rounded-[10px] bg-ink px-2.5 py-1 font-[var(--font-display)] text-[11.5px] font-bold text-bg animate-toast-pop"
          style={{
            left: `clamp(8px, calc(${active.pct}% - 50px), calc(100% - 110px))`,
          }}
        >
          {active.name} ·{" "}
          {active.status === "not_started"
            ? "not started"
            : active.status === "finished"
              ? "finished ✓"
              : active.chapter != null
                ? `ch. ${active.chapter}`
                : `${active.pct}%`}
        </div>
      )}

      {/* the page edge */}
      <div
        className="relative h-[26px] rounded-lg border-[1.5px] border-line"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-bg-soft) 0 3px, var(--color-bg-sunken) 3px 4px)",
        }}
      >
        {/* median fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-[6px] bg-primary/25 border-r-2 border-primary"
          style={{ width: `${Math.min(100, Math.max(0, median))}%` }}
        />
        {/* member bookmarks sticking out the top */}
        {placed.map((m) => {
          const isActive = active?.userId === m.userId;
          return (
            <button
              key={m.userId}
              type="button"
              data-testid={`bookmark-${m.userId}`}
              aria-label={`${m.name}, ${m.pct}%`}
              onClick={(e) => {
                e.stopPropagation();
                setActive(isActive ? null : m);
              }}
              className="absolute -top-4 h-[34px] w-[14px] cursor-pointer bg-transparent p-0"
              style={{ left: `calc(${m.displayPct}% - 7px)` }}
            >
              <span
                className={`block h-full w-full rounded-t-[3px] shadow-[1px_0_2px_rgba(96,64,32,0.25)] transition-transform duration-200 ${
                  m.you ? "bg-primary" : m.status === "finished" ? "bg-accent" : "bg-ink-4"
                } ${isActive ? "-translate-y-1" : ""}`}
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between font-[var(--font-display)] text-[10.5px] font-bold text-ink-3">
        <span>FIRST PAGE</span>
        <span>THE END</span>
      </div>
    </div>
  );
}
