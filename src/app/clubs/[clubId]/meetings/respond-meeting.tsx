// @spec MEET-UI-RESP-SAVE-001, MEET-BE-RESP-EMPTY-001, DENSITY-MEET-002
"use client";

import { useRef, useState } from "react";

import { trpc } from "@/trpc/react-hooks";

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
  // Race-guard: rapid clicks fire overlapping mutations. We only honor the
  // most recent fire by tagging it with a token and comparing in the callback.
  const requestToken = useRef(0);
  const latestPayload = useRef<{ slotId: string; status: ResponseStatus }[]>([]);

  const submitAvailability = trpc.meetings.submitAvailability.useMutation({
    onSuccess: (_data, variables) => {
      const responsesArr = variables.responses as {
        slotId: string;
        status: ResponseStatus;
      }[];
      if (responsesArr !== latestPayload.current) return;
      setSaveStatus("saved");
      onResponsesUpdated?.(responsesArr);
    },
    onError: (err, variables) => {
      const responsesArr = variables.responses as {
        slotId: string;
        status: ResponseStatus;
      }[];
      if (responsesArr !== latestPayload.current) return;
      setSaveStatus("error");
      setError(err.message || "Failed to save");
    },
  });

  function persist(next: Record<string, ResponseStatus>) {
    const responseArray = Object.entries(next).map(([slotId, status]) => ({
      slotId,
      status,
    }));

    // @spec MEET-UI-RESP-SAVE-001 — inline error when no slot has a response.
    // Catches the "toggle the only selection off" case before we hit the server.
    if (responseArray.length === 0) {
      setSaveStatus("error");
      setError("Please select availability for at least one time");
      return;
    }

    requestToken.current += 1;
    latestPayload.current = responseArray;
    setSaveStatus("saving");
    setError("");

    submitAvailability.mutate({ clubId, meetingId, responses: responseArray });
  }

  function setSlotResponse(slotId: string, status: ResponseStatus) {
    // Rapid-click guard: while a save is in flight, ignore further clicks so
    // overlapping mutations can't race past the object-ref dedup token.
    if (submitAvailability.isPending) return;

    // Toggle off if the same option is clicked again.
    const next = { ...responses };
    if (next[slotId] === status) {
      delete next[slotId];
    } else {
      next[slotId] = status;
    }
    setResponses(next);
    persist(next);
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
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 p-3 bg-bg-soft rounded-[var(--radius-md)] border border-line"
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
            <div className="flex gap-1.5 w-full sm:w-auto">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSlotResponse(slot.id, opt.value)}
                  disabled={submitAvailability.isPending}
                  data-testid={`slot-${slot.id}-${opt.value}`}
                  className={`flex-1 sm:flex-none px-2.5 py-2 sm:py-1 text-xs font-medium rounded-[var(--radius-sm)] border transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
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
