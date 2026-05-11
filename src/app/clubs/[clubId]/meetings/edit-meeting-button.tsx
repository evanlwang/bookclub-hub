"use client";

import { useState } from "react";
import { trpc } from "@/trpc/react-hooks";
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
  const [error, setError] = useState("");

  const updateMeeting = trpc.meetings.update.useMutation({
    onError: (err) => {
      setError(err.message ?? "Failed to save");
    },
  });

  function handleSave(next: MeetingEditableFields) {
    setError("");
    updateMeeting.mutate(
      {
        clubId,
        meetingId,
        title: next.title || undefined,
        // Empty strings clear the field; coerce to "" so the API explicitly
        // sees the change rather than treating undefined as "unchanged."
        description: next.description,
        location: next.location,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onUpdated?.(next);
        },
      },
    );
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
          submitting={updateMeeting.isPending}
          error={error}
          onSave={handleSave}
          onCancel={() => {
            if (!updateMeeting.isPending) {
              setOpen(false);
              setError("");
            }
          }}
        />
      )}
    </>
  );
}
