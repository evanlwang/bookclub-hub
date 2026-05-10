"use client";

import { useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/meetings.cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, meetingId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message ?? "Failed to cancel");
        return;
      }
      setOpen(false);
      onCancelled?.();
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
          submitting={submitting}
          error={error}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!submitting) {
              setOpen(false);
              setError("");
            }
          }}
        />
      )}
    </>
  );
}
