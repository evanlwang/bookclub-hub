// @spec PROG-UI-DOGEAR-001, PROG-UI-BOOKMARK-SLIDER-001
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The save reward: a folded paper corner that springs onto the progress
 * summary card. Self-contained — it listens for the global `dogear:saved`
 * event the update sheet fires, so it needs no prop wiring across the page's
 * server/client boundary.
 */
export function DogEarCorner() {
  const [trigger, setTrigger] = useState(0);
  useEffect(() => {
    const onSaved = () => setTrigger((t) => t + 1);
    window.addEventListener("dogear:saved", onSaved);
    return () => window.removeEventListener("dogear:saved", onSaved);
  }, []);
  if (!trigger) return null;
  return (
    <div
      key={trigger}
      aria-hidden="true"
      className="absolute top-0 right-0 w-[34px] h-[34px] pointer-events-none"
    >
      <div className="absolute inset-0 rounded-tr-[var(--radius-lg)] overflow-hidden origin-top-right animate-dogear-fold">
        {/* the page revealed beneath the fold */}
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[34px] border-t-bg border-l-[34px] border-l-transparent" />
        {/* the folded terracotta flap */}
        <div className="absolute top-0 right-0 w-0 h-0 border-b-[34px] border-b-primary border-r-[34px] border-r-transparent drop-shadow-[-2px_2px_3px_rgba(96,64,32,0.3)]" />
      </div>
    </div>
  );
}

/**
 * Vertical page-edge slider: a faux page with text lines and a striped
 * page-edge track carrying a draggable terracotta bookmark ribbon. Drives the
 * same percentage as the numeric page input (bidirectional). Keyboard arrows
 * adjust ±1% via the hidden range input for accessibility.
 */
export function BookmarkSlider({
  pct,
  disabled,
  onChange,
}: {
  pct: number;
  disabled?: boolean;
  onChange: (pct: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const clamped = Math.max(0, Math.min(100, pct));

  function handle(clientY: number) {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const usable = r.height - 26;
    let p = ((clientY - r.top - 13) / usable) * 100;
    p = Math.max(0, Math.min(100, p));
    onChange(Math.round(p));
  }

  const top = `calc(${clamped / 100} * (100% - 26px))`;

  return (
    <div className="flex h-[190px] select-none" data-testid="bookmark-slider">
      {/* the page */}
      <div className="relative flex-1 overflow-hidden rounded-l-[12px] border-[1.5px] border-r-0 border-line-strong bg-bg-soft">
        <div className="absolute inset-[16px_18px] flex flex-col gap-[9px]">
          {[92, 100, 96, 88, 100, 94, 78, 98, 90, 60].map((w, i) => (
            <div
              key={i}
              className="h-[3.5px] rounded-[2px] bg-line opacity-80"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        {/* read tint above the bookmark */}
        <div
          className="absolute top-0 left-0 right-0 bg-primary-soft"
          style={{
            height: `calc(${top} + 13px)`,
            opacity: 0.7,
            transition: dragging.current ? "none" : "height .15s ease",
          }}
        />
      </div>
      {/* the page edge + bookmark */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Reading position"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(e) => {
          if (disabled) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          handle(e.clientY);
        }}
        onPointerMove={(e) => dragging.current && handle(e.clientY)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowLeft")
            onChange(Math.max(0, clamped - 1));
          if (e.key === "ArrowDown" || e.key === "ArrowRight")
            onChange(Math.min(100, clamped + 1));
        }}
        className="relative w-[56px] rounded-r-[12px] border-[1.5px] border-line-strong cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          background:
            "repeating-linear-gradient(180deg, var(--color-bg-soft) 0 2px, var(--color-bg-sunken) 2px 3px)",
        }}
      >
        <div
          className="absolute left-[-7px] right-[6px] h-[26px]"
          style={{ top, transition: dragging.current ? "none" : "top .15s ease" }}
        >
          {/* bookmark ribbon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px] rounded-[6px_4px_4px_6px] bg-primary shadow-[0_3px_8px_rgba(199,91,57,0.45)]">
            <span className="h-[2px] w-[18px] rounded-full bg-bg-soft/70" />
            <span className="h-[2px] w-[18px] rounded-full bg-bg-soft/70" />
            <span className="h-[2px] w-[18px] rounded-full bg-bg-soft/70" />
          </div>
          {/* ribbon tail */}
          <div
            className="absolute right-[-14px] top-1 bottom-1 w-4 bg-primary-hover rounded-r-[2px]"
            style={{ clipPath: "polygon(0 0, 100% 0, 62% 50%, 100% 100%, 0 100%)" }}
          />
        </div>
      </div>
    </div>
  );
}
