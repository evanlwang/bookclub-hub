"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import {
  pickMostAvailableSlot,
  summarizeSlot,
  type ResponseStatus,
} from "@/lib/meetings/availability";
import { trpc } from "@/trpc/react-hooks";
import { CancelMeetingButton } from "./cancel-meeting-button";
import { EditMeetingButton } from "./edit-meeting-button";
import { type MeetingEditableFields } from "./edit-meeting-dialog";

type Slot = {
  id: string;
  proposedTime: string | Date;
  durationMinutes: number;
  responses: Array<{
    userId: string;
    status: ResponseStatus;
    user?: { id: string; displayName: string } | null;
  }>;
};

interface AdminConfirmSectionProps {
  clubId: string;
  meetingId: string;
  meetingTitle: string;
  meetingDescription?: string;
  meetingLocation?: string;
  slots: Slot[];
  onConfirmed?: (slotId: string) => void;
  onCancelled?: () => void;
  onUpdated?: (next: MeetingEditableFields) => void;
}

// @spec MEET-UI-CONFIRM-BTN-001, MEET-UI-CONFIRM-HEATMAP-001, MEET-UI-CONFIRM-BADGE-001, MEET-UI-CANCEL-BTN-001, MEET-UI-EDIT-BTN-001, DENSITY-MEET-001
export function AdminConfirmSection({
  clubId,
  meetingId,
  meetingTitle,
  meetingDescription,
  meetingLocation,
  slots,
  onConfirmed,
  onCancelled,
  onUpdated,
}: AdminConfirmSectionProps) {
  const router = useRouter();
  const [confirmingSlotId, setConfirmingSlotId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const confirmMeeting = trpc.meetings.confirm.useMutation({
    onSuccess: (_data, variables) => {
      if (onConfirmed) {
        onConfirmed(variables.slotId);
      } else {
        router.refresh();
      }
    },
    onError: (err) => {
      setError(err.message ?? "Failed to confirm");
    },
    onSettled: () => {
      setConfirmingSlotId(null);
    },
  });

  const mostAvailable = useMemo(() => pickMostAvailableSlot(slots), [slots]);
  const totalResponses = useMemo(
    () => slots.reduce((acc, s) => acc + s.responses.length, 0),
    [slots],
  );
  const noResponses = totalResponses === 0;

  const responders = useMemo(() => {
    const byUser = new Map<string, string>();
    for (const slot of slots) {
      for (const r of slot.responses) {
        if (!byUser.has(r.userId)) {
          byUser.set(r.userId, r.user?.displayName ?? r.userId.slice(0, 6));
        }
      }
    }
    return [...byUser.entries()]
      .map(([userId, displayName]) => ({ userId, displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [slots]);

  function statusFor(slot: Slot, userId: string): ResponseStatus | "none" {
    return slot.responses.find((r) => r.userId === userId)?.status ?? "none";
  }

  function handleConfirm(slotId: string) {
    setConfirmingSlotId(slotId);
    setError("");
    confirmMeeting.mutate({ clubId, meetingId, slotId });
  }

  return (
    <div
      data-testid="admin-confirm-section"
      className="mt-4 pt-4 border-t border-line"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">Pick a time</h3>
        {noResponses ? (
          <span
            data-testid="confirm-disabled-hint"
            className="text-[11px] text-ink-3 italic"
          >
            Wait for at least one response before confirming
          </span>
        ) : (
          <span className="text-xs text-ink-3">Admin · confirms the meeting</span>
        )}
      </div>

      <ul className="space-y-2">
        {slots.map((slot) => {
          const summary = summarizeSlot(slot);
          const isMostAvailable = mostAvailable?.id === slot.id;
          const isConfirming = confirmingSlotId === slot.id;
          const time = new Date(slot.proposedTime).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <li
              key={slot.id}
              data-testid={`admin-slot-${slot.id}`}
              className={`p-3 rounded-[var(--radius-md)] border ${
                isMostAvailable
                  ? "border-success bg-success-soft/40"
                  : "border-line bg-bg-soft"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">{time}</span>
                    <span className="text-xs text-ink-3">
                      ({slot.durationMinutes}min)
                    </span>
                    {isMostAvailable && (
                      <span data-testid="most-available-badge">
                        <Badge tone="success" dot>
                          Most available
                        </Badge>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5 tabular-nums">
                    <span className="text-success">{summary.available} available</span>
                    {summary.maybe > 0 && (
                      <>
                        {" · "}
                        <span className="text-warning-ink">
                          {summary.maybe} maybe
                        </span>
                      </>
                    )}
                    {summary.unavailable > 0 && (
                      <>
                        {" · "}
                        <span className="text-ink-3">
                          {summary.unavailable} can't
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant={isMostAvailable ? "primary" : "ghost"}
                  size="sm"
                  loading={isConfirming}
                  disabled={noResponses}
                  onClick={() => handleConfirm(slot.id)}
                  data-testid={`confirm-slot-${slot.id}`}
                >
                  Confirm time
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {responders.length > 0 && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-ink-3">Per-member availability</p>
            {slots.length > 3 && (
              <p className="text-[11px] text-ink-3 md:hidden">scroll →</p>
            )}
          </div>
          {/* @spec DENSITY-MEET-001 — matrix stays scroll-contained; the member
              column is pinned so names stay readable while slots scroll. */}
          <div data-testid="availability-heatmap" className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-bg text-left text-ink-3 font-normal pr-3 pb-1.5">
                    Member
                  </th>
                  {slots.map((slot, i) => (
                    <th
                      key={slot.id}
                      className="px-2 pb-1.5 text-ink-3 font-normal text-center"
                    >
                      Slot {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responders.map((r) => (
                  <tr key={r.userId}>
                    <td className="sticky left-0 z-10 bg-bg pr-3 py-1 text-ink-2 truncate max-w-[120px]">
                      {r.displayName}
                    </td>
                    {slots.map((slot) => {
                      const status = statusFor(slot, r.userId);
                      return (
                        <td
                          key={slot.id}
                          className="px-2 py-1 text-center"
                        >
                          <span
                            data-testid={`heatmap-cell-${r.userId}-${slot.id}`}
                            data-status={status}
                            className={`inline-block w-3 h-3 rounded-full ${
                              status === "available"
                                ? "bg-success"
                                : status === "maybe"
                                  ? "bg-warning"
                                  : status === "unavailable"
                                    ? "bg-danger"
                                    : "bg-bg-sunken border border-line"
                            }`}
                            aria-label={status}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p
          data-testid="confirm-error"
          className="text-xs text-danger mt-3"
        >
          {error}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-line flex justify-end gap-3">
        <EditMeetingButton
          clubId={clubId}
          meetingId={meetingId}
          initial={{
            title: meetingTitle,
            description: meetingDescription ?? "",
            location: meetingLocation ?? "",
          }}
          onUpdated={onUpdated}
        />
        <CancelMeetingButton
          clubId={clubId}
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          onCancelled={onCancelled}
        />
      </div>
    </div>
  );
}
