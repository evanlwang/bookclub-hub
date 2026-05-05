"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type Slot = {
  id: string;
  proposedTime: string;
  durationMinutes: number;
};

interface RespondMeetingProps {
  clubId: string;
  meetingId: string;
  slots: Slot[];
  onDone: () => void;
}

type ResponseStatus = "available" | "maybe" | "unavailable";

export function RespondMeeting({
  clubId,
  meetingId,
  slots,
  onDone,
}: RespondMeetingProps) {
  const [responses, setResponses] = useState<Record<string, ResponseStatus>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function setSlotResponse(slotId: string, status: ResponseStatus) {
    setResponses((prev) => ({ ...prev, [slotId]: status }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    const responseArray = Object.entries(responses).map(([slotId, status]) => ({
      slotId,
      status,
    }));

    if (responseArray.length === 0) {
      setError("Please select availability for at least one time");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/trpc/meetings.submitAvailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, meetingId, responses: responseArray }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to save");
      } else {
        setSaved(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const statusOptions: { value: ResponseStatus; label: string; color: string }[] = [
    { value: "available", label: "Available", color: "border-success bg-success-soft text-success" },
    { value: "maybe", label: "Maybe", color: "border-warning bg-warning-soft text-[oklch(0.45_0.10_70)]" },
    { value: "unavailable", label: "Can't", color: "border-danger bg-danger-soft text-danger" },
  ];

  return (
    <div data-testid="respond-meeting" className="animate-slide-down">
      <div className="space-y-3 mb-4">
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

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          onClick={handleSave}
          data-testid="save-availability-btn"
        >
          Save Availability
        </Button>
        {saved && (
          <span className="text-xs text-success animate-fade-in" data-testid="availability-saved">
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}
