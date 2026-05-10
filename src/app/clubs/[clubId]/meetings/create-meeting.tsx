"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface CreateMeetingProps {
  clubId: string;
}

type Slot = { time: string; durationMinutes: number };

function nowLocalIsoMinutes(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  // Build a "YYYY-MM-DDTHH:MM" string in local time so it's a valid `min` for
  // <input type="datetime-local"> (which is naive-local, not UTC).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    { time: "", durationMinutes: 60 },
    { time: "", durationMinutes: 60 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const minDateTime = nowLocalIsoMinutes();

  function addSlot() {
    if (slots.length >= 5) return;
    setSlots([...slots, { time: "", durationMinutes: 60 }]);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const validSlots = slots
      .filter((s) => s.time)
      .map((s) => ({
        time: new Date(s.time).toISOString(),
        durationMinutes: s.durationMinutes,
      }));

    if (validSlots.length < 2) {
      setError("At least 2 time slots are required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/trpc/meetings.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          title: title || undefined,
          location: location.trim() || undefined,
          description: description || undefined,
          slots: validSlots,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to create meeting");
      } else {
        // tRPC v11 HTTP response shape: { result: { data: { meeting } } }
        onCreated(data.result?.data?.meeting);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
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
                if (!loading) {
                  void handleSubmit(e as unknown as React.FormEvent);
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
      <div className="mb-4 space-y-2">
        <label className="block text-[13px] font-medium text-ink-2 mb-1">
          Time Options
        </label>
        {slots.map((slot, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-2"
            data-testid={`slot-row-${i}`}
          >
            <input
              type="datetime-local"
              value={slot.time}
              min={minDateTime}
              onChange={(e) => updateSlot(i, "time", e.target.value)}
              data-testid={`slot-time-${i}`}
              className="min-w-0 flex-1 text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <div className="flex items-center gap-2">
              <select
                value={slot.durationMinutes}
                onChange={(e) =>
                  updateSlot(i, "durationMinutes", Number(e.target.value))
                }
                className="flex-1 sm:flex-none text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-2 py-2 text-ink"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hr</option>
                <option value={90}>1.5 hr</option>
                <option value={120}>2 hr</option>
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
        ))}
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
          loading={loading}
          type="submit"
          data-testid="submit-meeting-btn"
        >
          Send to Members
        </Button>
      </div>
    </form>
  );
}
