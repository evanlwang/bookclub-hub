"use client";

import { useState } from "react";
import { Button, DateTimePicker } from "@/components/ui";
import { trpc } from "@/trpc/react-hooks";

interface CreateMeetingProps {
  clubId: string;
}

type Slot = { time: string; durationMinutes: number };

// @spec MEET-API-CREATE-VAL-001, MEET-UI-CREATE-002
const DEFAULT_DURATION_MINUTES = 120;
const DURATION_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
  { value: 150, label: "2.5 hr" },
  { value: 180, label: "3 hr" },
  { value: 240, label: "4 hr" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalIsoMinutes(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return toLocalIso(d);
}

// Returns the upcoming date for a given weekday (0=Sun..6=Sat) at hour:min.
// If today is the target weekday and the target time hasn't passed, returns today.
function nextWeekdayAt(weekday: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMilliseconds(0);
  const today = d.getDay();
  let daysAhead = (weekday - today + 7) % 7;
  if (daysAhead === 0) {
    const candidate = new Date(d);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate.getTime() <= d.getTime()) daysAhead = 7;
  }
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function tomorrowAt(hour: number, minute = 0): Date {
  const d = todayAt(hour, minute);
  d.setDate(d.getDate() + 1);
  return d;
}

interface QuickPick {
  label: string;
  build: () => Date;
}

function buildQuickPicks(): QuickPick[] {
  const now = new Date();
  const picks: QuickPick[] = [];
  // "Tonight" only if 7pm is still in the future today.
  const tonight = todayAt(19);
  if (tonight.getTime() > now.getTime()) {
    picks.push({ label: "Tonight 7pm", build: () => todayAt(19) });
  }
  picks.push({ label: "Tomorrow 7pm", build: () => tomorrowAt(19) });
  picks.push({ label: "Sat 7pm", build: () => nextWeekdayAt(6, 19) });
  const nextSat = nextWeekdayAt(6, 19);
  nextSat.setDate(nextSat.getDate() + 7);
  picks.push({ label: "Next Sat 7pm", build: () => nextSat });
  return picks;
}

function formatRelative(iso: string): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const diffDays = Math.round(
    (startOfDay(dt).getTime() - startOfDay(new Date()).getTime()) / 86_400_000
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 1) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

export function ProposeMeetingTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="primary"
      size="md"
      onClick={onClick}
      data-testid="propose-meeting-btn"
    >
      Propose Meeting
    </Button>
  );
}

export function CreateMeetingForm({
  clubId,
  onCreated,
  onCancel,
}: CreateMeetingProps & { onCreated: (meeting: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([
    { time: "", durationMinutes: DEFAULT_DURATION_MINUTES },
    { time: "", durationMinutes: DEFAULT_DURATION_MINUTES },
  ]);
  const [error, setError] = useState("");
  const minDateTime = nowLocalIsoMinutes();
  const quickPicks = buildQuickPicks();

  const utils = trpc.useUtils();
  const createMeeting = trpc.meetings.create.useMutation({
    onSuccess: (data) => {
      void utils.meetings.list.invalidate({ clubId });
      onCreated(data.meeting);
    },
    onError: (err) => {
      setError(err.message || "Failed to create meeting");
    },
  });

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots([...slots, { time: "", durationMinutes: DEFAULT_DURATION_MINUTES }]);
  }

  function removeSlot(index: number) {
    if (slots.length <= 2) return;
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof Slot, value: string | number) {
    setSlots(
      slots.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  // Quick-pick fills the next empty slot. If every slot has a time and there's
  // room, we append a new slot; otherwise overwrite the last one.
  function applyQuickPick(date: Date) {
    const iso = toLocalIso(date);
    const emptyIdx = slots.findIndex((s) => !s.time);
    if (emptyIdx !== -1) {
      updateSlot(emptyIdx, "time", iso);
      return;
    }
    if (slots.length < 5) {
      setSlots([...slots, { time: iso, durationMinutes: DEFAULT_DURATION_MINUTES }]);
      return;
    }
    updateSlot(slots.length - 1, "time", iso);
  }

  // @spec MEET-UI-CREATE-VAL-001, MEET-BE-CREATE-DEDUP-001
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validSlots = slots
      .filter((s) => s.time)
      .map((s) => ({
        time: new Date(s.time).toISOString(),
        durationMinutes: s.durationMinutes,
      }));

    if (validSlots.length < 2) {
      setError("At least 2 time slots are required");
      return;
    }

    // @spec MEET-BE-CREATE-DEDUP-001 — pre-flight inline warning before the
    // server rejects. Compare by exact ISO instant; differing durations at the
    // same instant still count as duplicates.
    const seen = new Set<string>();
    for (const s of validSlots) {
      if (seen.has(s.time)) {
        setError("Two time slots have the same date and time");
        return;
      }
      seen.add(s.time);
    }

    createMeeting.mutate({
      clubId,
      title: title || undefined,
      location: location.trim() || undefined,
      description: description || undefined,
      slots: validSlots,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="create-meeting-form"
      className="bg-bg border border-line rounded-[var(--radius-lg)] p-4 sm:p-5 mb-6 animate-slide-down"
    >
      <h3 className="font-medium text-ink text-sm mb-4">Propose Meeting</h3>

      <div className="mb-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title (optional)"
          data-testid="meeting-title-input"
          autoFocus
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="mb-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-ink-3 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location or address (optional)"
            data-testid="meeting-location-input"
            className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] pl-9 pr-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {!showDesc ? (
        <button
          type="button"
          onClick={() => setShowDesc(true)}
          className="text-xs text-primary hover:underline mb-3 block"
        >
          + Add description
        </button>
      ) : (
        <div className="mb-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (!createMeeting.isPending) {
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }
            }}
            placeholder="Description"
            data-testid="meeting-desc-input"
            rows={2}
            className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
          />
        </div>
      )}

      {/* Time slots */}
      <div className="mb-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <label className="block text-[13px] font-medium text-ink-2">
            Time Options
          </label>
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="quick-picks">
            {quickPicks.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => applyQuickPick(qp.build())}
                className="text-[11px] font-medium text-ink-2 bg-bg-soft border border-line rounded-full px-2.5 py-1 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {slots.map((slot, i) => {
          const relative = formatRelative(slot.time);
          return (
            <div
              key={i}
              className="space-y-1"
              data-testid={`slot-row-${i}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <div className="min-w-0 flex-1">
                  <DateTimePicker
                    value={slot.time}
                    min={minDateTime}
                    onChange={(v) => updateSlot(i, "time", v)}
                    data-testid={`slot-time-${i}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={slot.durationMinutes}
                    onChange={(e) =>
                      updateSlot(i, "durationMinutes", Number(e.target.value))
                    }
                    aria-label="Duration"
                    className="flex-1 sm:flex-none text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-2 py-2 text-ink"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {slots.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      data-testid={`remove-slot-${i}`}
                      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-ink-3 hover:text-danger hover:bg-danger-soft transition-colors"
                      aria-label="Remove time slot"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {relative && (
                <p
                  className="text-[11px] text-ink-3 pl-9"
                  data-testid={`slot-relative-${i}`}
                >
                  {relative}
                </p>
              )}
            </div>
          );
        })}
        {slots.length < 5 && (
          <button
            type="button"
            onClick={addSlot}
            data-testid="add-slot-btn"
            className="text-xs text-primary hover:underline"
          >
            + Add another time
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger mb-3" data-testid="meeting-error">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          loading={createMeeting.isPending}
          type="submit"
          data-testid="submit-meeting-btn"
        >
          Send to Members
        </Button>
      </div>
    </form>
  );
}
