"use client";

import { useState } from "react";
import {
  EditMeetingDialog,
  type MeetingEditableFields,
} from "./edit-meeting-dialog";

interface EditMeetingButtonProps {
  clubId: string;
  meetingId: string;
  initial: MeetingEditableFields;
  className?: string;
  onUpdated?: (next: MeetingEditableFields) => void;
}

export function EditMeetingButton({
  clubId,
  meetingId,
  initial,
  className,
  onUpdated,
}: EditMeetingButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(next: MeetingEditableFields) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/meetings.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          meetingId,
          title: next.title || undefined,
          // Empty strings clear the field; coerce to "" so the API explicitly
          // sees the change rather than treating undefined as "unchanged."
          description: next.description,
          location: next.location,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message ?? "Failed to save");
        return;
      }
      setOpen(false);
      onUpdated?.(next);
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
        data-testid={`edit-meeting-${meetingId}`}
        className={
          className ??
          "text-xs text-ink-3 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
        }
      >
        Edit
      </button>
      {open && (
        <EditMeetingDialog
          initial={initial}
          submitting={submitting}
          error={error}
          onSave={handleSave}
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
