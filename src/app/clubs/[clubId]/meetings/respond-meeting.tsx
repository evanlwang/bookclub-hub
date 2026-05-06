"use client";

import { useRef, useState } from "react";

type Slot = {
  id: string;
  proposedTime: string;
  durationMinutes: number;
};

type ResponseStatus = "available" | "maybe" | "unavailable";

interface RespondMeetingProps {
  clubId: string;
  meetingId: string;
  slots: Slot[];
  initialResponses?: Record<string, ResponseStatus>;
  onResponsesUpdated?: (
    next: { slotId: string; status: ResponseStatus }[]
  ) => void;
  onDone: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function RespondMeeting({
  clubId,
  meetingId,
  slots,
  initialResponses,
  onResponsesUpdated,
}: RespondMeetingProps) {
  const [responses, setResponses] = useState<Record<string, ResponseStatus>>(
    initialResponses ?? {}
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");
  const requestToken = useRef(0);

  async function persist(next: Record<string, ResponseStatus>) {
    const responseArray = Object.entries(next).map(([slotId, status]) => ({
      slotId,
      status,
    }));

    const token = ++requestToken.current;
    setSaveStatus("saving");
    setError("");

    try {
      const res = await fetch("/api/trpc/meetings.submitAvailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, meetingId, responses: responseArray }),
      });
      const data = await res.json();
      // Ignore stale responses if a newer click already started.
      if (token !== requestToken.current) return;

      if (data.error) {
        setSaveStatus("error");
        setError(data.error.message || "Failed to save");
        return;
      }
      setSaveStatus("saved");
      onResponsesUpdated?.(responseArray);
    } catch {
      if (token !== requestToken.current) return;
      setSaveStatus("error");
      setError("Something went wrong");
    }
  }

  function setSlotResponse(slotId: string, status: ResponseStatus) {
    // Toggle off if the same option is clicked again.
    const next = { ...responses };
    if (next[slotId] === status) {
      delete next[slotId];
    } else {
      next[slotId] = status;
    }
    setResponses(next);
    void persist(next);
  }

  const statusOptions: { value: ResponseStatus; label: string; color: string }[] = [
    { value: "available", label: "Available", color: "border-success bg-success-soft text-success" },
    { value: "maybe", label: "Maybe", color: "border-warning bg-warning-soft text-[oklch(0.45_0.10_70)]" },
    { value: "unavailable", label: "Can't", color: "border-danger bg-danger-soft text-danger" },
  ];

  return (
    <div data-testid="respond-meeting" className="animate-slide-down">
      <div className="space-y-3 mb-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between gap-4 p-3 bg-bg-soft rounded-[var(--radius-md)] border border-line"
          >
            <div className="text-sm text-ink">
              {new Date(slot.proposedTime).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              <span className="text-ink-3 ml-1">({slot.durationMinutes}min)</span>
            </div>
            <div className="flex gap-1">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSlotResponse(slot.id, opt.value)}
                  data-testid={`slot-${slot.id}-${opt.value}`}
                  className={`px-2.5 py-1 text-xs font-medium rounded-[var(--radius-sm)] border transition-all duration-150 cursor-pointer ${
                    responses[slot.id] === opt.value
                      ? opt.color
                      : "border-line bg-bg text-ink-3 hover:border-line-strong"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs h-5" aria-live="polite">
        {saveStatus === "saving" && (
          <span className="text-ink-3" data-testid="availability-saving">
            Saving…
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="text-success" data-testid="availability-saved">
            ✓ Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-danger" data-testid="availability-error">
            {error || "Couldn’t save — try again"}
          </span>
        )}
      </div>
    </div>
  );
}
