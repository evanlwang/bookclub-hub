"use client";

import { useState } from "react";
import { trpc } from "@/trpc/react-hooks";
import { CancelMeetingDialog } from "./cancel-meeting-dialog";

interface CancelMeetingButtonProps {
  clubId: string;
  meetingId: string;
  meetingTitle: string;
  className?: string;
  onCancelled?: () => void;
}

// Plain text-style trigger so it can sit unobtrusively below a primary
// action (e.g. the Confirm picker) without competing for attention.
export function CancelMeetingButton({
  clubId,
  meetingId,
  meetingTitle,
  className,
  onCancelled,
}: CancelMeetingButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const cancelMeeting = trpc.meetings.cancel.useMutation({
    onSuccess: () => {
      setOpen(false);
      onCancelled?.();
    },
    onError: (err) => {
      setError(err.message ?? "Failed to cancel");
    },
  });

  function handleConfirm() {
    setError("");
    cancelMeeting.mutate({ clubId, meetingId });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        data-testid={`cancel-meeting-${meetingId}`}
        className={
          className ??
          "text-xs font-medium text-danger hover:text-danger/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger rounded"
        }
      >
        Cancel meeting
      </button>
      {open && (
        <CancelMeetingDialog
          meetingTitle={meetingTitle}
          submitting={cancelMeeting.isPending}
          error={error}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!cancelMeeting.isPending) {
              setOpen(false);
              setError("");
            }
          }}
        />
      )}
    </>
  );
}
