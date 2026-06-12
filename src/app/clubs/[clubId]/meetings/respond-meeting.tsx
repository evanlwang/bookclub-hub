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
  const utils = trpc.useUtils();
  // Race-guard: rapid clicks fire overlapping mutations. We only honor the
  // most recent fire by tagging it with a token and comparing in the callback.
  const requestToken = useRef(0);
  const latestPayload = useRef<{ slotId: string; status: ResponseStatus }[]>([]);
  // Pre-mutation cache snapshot for rollback (MEET-UI-RESPOND-OPTIMISTIC-001).
  const cacheSnapshot = useRef<unknown>(undefined);

  // @spec MEET-UI-RESPOND-OPTIMISTIC-001
  // The cache write happens in `onMutate` (via the parent's
  // `applyViewerResponses` transform) so responded counts and the progress
  // bar update immediately; errors restore the snapshot; settle reconciles
  // with the server and refreshes the nav "Respond" badge.
  const submitAvailability = trpc.meetings.submitAvailability.useMutation({
    onMutate: async (variables) => {
      await utils.meetings.list.cancel({ clubId });
      cacheSnapshot.current = utils.meetings.list.getData({ clubId });
      onResponsesUpdated?.(
        variables.responses as { slotId: string; status: ResponseStatus }[]
      );
    },
    onSuccess: (_data, variables) => {
      const responsesArr = variables.responses as {
        slotId: string;
        status: ResponseStatus;
      }[];
      if (responsesArr !== latestPayload.current) return;
      setSaveStatus("saved");
    },
    onError: (err, variables) => {
      if (cacheSnapshot.current !== undefined) {
        utils.meetings.list.setData(
          { clubId },
          cacheSnapshot.current as Parameters<
            typeof utils.meetings.list.setData
          >[1]
        );
      }
      const responsesArr = variables.responses as {
        slotId: string;
        status: ResponseStatus;
      }[];
      if (responsesArr !== latestPayload.current) return;
      setSaveStatus("error");
      setError(err.message || "Failed to save");
    },
    onSettled: () => {
      void utils.meetings.list.invalidate({ clubId });
      // @spec CLUB-NAV-BADGE-LIVE-001 — answering the last outstanding poll
      // clears the sidebar "Respond" badge via the navState query.
      void utils.clubs.navState.invalidate();
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

  // @spec MEET-UI-RSVP-POSTCARD-001 — three-state postcard checkboxes:
  // dashed-border idle, colored border + tint + ✓?✗ mark when picked.
  const statusOptions: {
    value: ResponseStatus;
    label: string;
    mark: string;
    active: string;
    markColor: string;
  }[] = [
    { value: "available", label: "Available", mark: "✓", active: "border-success bg-success-soft text-success", markColor: "border-success text-success" },
    { value: "maybe", label: "Maybe", mark: "?", active: "border-warning bg-warning-soft text-warning-ink", markColor: "border-warning text-warning-ink" },
    { value: "unavailable", label: "Can't", mark: "✗", active: "border-danger bg-danger-soft text-danger", markColor: "border-danger text-danger" },
  ];

  return (
    <div data-testid="respond-meeting" className="animate-slide-down">
      <div className="space-y-3 mb-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="p-3.5 bg-bg-soft rounded-[var(--radius-md)] border border-line"
          >
            <div className="font-[var(--font-display)] text-[14.5px] font-extrabold text-ink">
              {new Date(slot.proposedTime).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              <span className="text-ink-3 font-semibold text-xs ml-1.5">({slot.durationMinutes}min)</span>
            </div>
            <div className="flex gap-2 mt-2.5">
              {statusOptions.map((opt) => {
                const active = responses[slot.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSlotResponse(slot.id, opt.value)}
                    disabled={submitAvailability.isPending}
                    data-testid={`slot-${slot.id}-${opt.value}`}
                    className={`flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border-2 px-1 py-2 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? `${opt.active} scale-[1.03]`
                        : "border-dashed border-line-strong bg-transparent text-ink-2"
                    }`}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 bg-bg-soft font-[var(--font-display)] text-xs font-black ${
                        active ? opt.markColor : "border-ink-3 text-transparent"
                      }`}
                    >
                      {active ? opt.mark : ""}
                    </span>
                    <span className="font-[var(--font-display)] text-xs font-extrabold">{opt.label}</span>
                  </button>
                );
              })}
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
