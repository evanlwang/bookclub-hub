"use client";

// @spec MEET-UI-CREATE-002
//
// Custom calendar + time popover. Replaces native `<input type="datetime-local">`
// in the meeting create form so the picker matches the rest of the service
// (Newsreader display font, OKLCH palette, soft-edge radii, primary teal).
//
// The component preserves the "YYYY-MM-DDTHH:MM" local-ISO contract of the
// native input so callers can swap it in without changing their state shape.

import { useEffect, useMemo, useRef, useState } from "react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
  "data-testid"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseIso(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Returns the 6×7 grid of days that fills the month view (Sun-first), with
// leading/trailing days drawn from the adjacent months.
function buildMonthGrid(viewMonth: Date): Date[] {
  const first = startOfMonth(viewMonth);
  const startWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MINUTE_STEPS = [0, 15, 30, 45] as const;

function formatTrigger(d: Date | null): string {
  if (!d) return "";
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function DateTimePicker({
  value,
  onChange,
  min,
  placeholder = "Pick a date & time",
  "data-testid": testId,
}: DateTimePickerProps) {
  const parsed = parseIso(value);
  const minDate = parseIso(min ?? "");
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(
    parsed ? startOfMonth(parsed) : startOfMonth(new Date())
  );
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Sync the calendar's view month when value changes from outside (e.g.,
  // a quick-pick chip selecting a date in a different month).
  useEffect(() => {
    if (parsed) setViewMonth(startOfMonth(parsed));
    // We intentionally key on the raw `value` so external updates re-anchor
    // the calendar view; `parsed` would re-derive every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const selected = parsed;
  const selectedHour = parsed ? parsed.getHours() : 19; // default 7 PM
  const selectedMinute = parsed ? parsed.getMinutes() : 0;
  const isPM = selectedHour >= 12;
  const display12 = ((selectedHour + 11) % 12) + 1;

  function commit(newDate: Date) {
    onChange(toIso(newDate));
  }

  function selectDay(d: Date) {
    const base = parsed ?? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0);
    const next = new Date(d);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    commit(next);
  }

  function changeHour(hour12: number) {
    const next = parsed ? new Date(parsed) : new Date(viewMonth.getFullYear(), viewMonth.getMonth(), today.getDate(), 19, 0);
    let h24 = hour12 % 12;
    if (isPM) h24 += 12;
    next.setHours(h24, selectedMinute, 0, 0);
    commit(next);
  }

  function changeMinute(min: number) {
    const next = parsed ? new Date(parsed) : new Date(viewMonth.getFullYear(), viewMonth.getMonth(), today.getDate(), selectedHour, min);
    next.setHours(selectedHour, min, 0, 0);
    commit(next);
  }

  function toggleMeridiem() {
    const next = parsed ? new Date(parsed) : new Date(viewMonth.getFullYear(), viewMonth.getMonth(), today.getDate(), 19, 0);
    next.setHours((next.getHours() + 12) % 24, next.getMinutes(), 0, 0);
    commit(next);
  }

  function isDisabled(d: Date): boolean {
    if (!minDate) return false;
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);
    return dEnd.getTime() < minDate.getTime();
  }

  return (
    <div className="relative" ref={wrapRef}>
      {/* Hidden native input — preserves the data-testid contract so Playwright
          fill() still drives the form, and acts as a non-JS form fallback. */}
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] pl-9 pr-3 py-2 text-left focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
      >
        <span className="absolute inset-y-0 left-3 flex items-center text-ink-3 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
        </span>
        <span className={selected ? "text-ink" : "text-ink-4"}>
          {selected ? formatTrigger(selected) : placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date and time"
          className="absolute z-30 mt-2 left-0 w-[19.5rem] bg-bg border border-line rounded-[var(--radius-lg)] shadow-[0_18px_40px_-12px_oklch(0.18_0.02_60/0.35)] overflow-hidden"
        >
          {/* Month header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
            <button
              type="button"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
              }
              aria-label="Previous month"
              className="w-7 h-7 flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-bg-soft transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="font-[var(--font-display)] text-[15px] font-semibold tracking-tight text-ink">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
              }
              aria-label="Next month"
              className="w-7 h-7 flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-bg-soft transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-[10px] font-medium text-ink-3 tracking-[0.12em] uppercase text-center"
              >
                {w.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-3">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = selected != null && sameDay(d, selected);
              const disabled = isDisabled(d);
              const base =
                "h-8 w-8 mx-auto flex items-center justify-center text-[13px] rounded-full transition-colors";
              let tone = "text-ink hover:bg-bg-soft";
              if (!inMonth) tone = "text-ink-4 hover:bg-bg-soft";
              if (isToday && !isSelected)
                tone = "text-primary font-semibold ring-1 ring-inset ring-primary/40 hover:bg-primary-soft";
              if (isSelected)
                tone = "bg-primary text-white font-semibold hover:bg-primary-hover";
              if (disabled) tone = "text-ink-4 cursor-not-allowed opacity-50";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && selectDay(d)}
                  data-testid={isSelected ? "calendar-day-selected" : undefined}
                  aria-pressed={isSelected || undefined}
                  className={`${base} ${tone}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="border-t border-line px-3 py-3 bg-bg-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.14em]">
                Time
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={display12}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isNaN(n) && n >= 1 && n <= 12) changeHour(n);
                  }}
                  aria-label="Hour"
                  className="w-12 text-center text-sm bg-bg border border-line rounded-[var(--radius-sm)] py-1 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 tabular-nums"
                />
                <span className="text-ink-3">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => changeMinute(Number(e.target.value))}
                  aria-label="Minute"
                  className="text-sm bg-bg border border-line rounded-[var(--radius-sm)] py-1 px-1 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 tabular-nums"
                >
                  {MINUTE_STEPS.map((m) => (
                    <option key={m} value={m}>
                      {pad(m)}
                    </option>
                  ))}
                </select>
                <div className="flex items-center bg-bg border border-line rounded-[var(--radius-sm)] overflow-hidden ml-1">
                  <button
                    type="button"
                    onClick={() => isPM && toggleMeridiem()}
                    aria-pressed={!isPM}
                    className={`text-[11px] font-medium px-2 py-1 transition-colors ${!isPM ? "bg-primary text-white" : "text-ink-3 hover:text-ink"}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => !isPM && toggleMeridiem()}
                    aria-pressed={isPM}
                    className={`text-[11px] font-medium px-2 py-1 transition-colors ${isPM ? "bg-primary text-white" : "text-ink-3 hover:text-ink"}`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-line">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[12px] text-ink-3 hover:text-ink transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Internal export for unit testing the date-grid utility.
export const __testing = { buildMonthGrid, sameDay, toIso, parseIso };
