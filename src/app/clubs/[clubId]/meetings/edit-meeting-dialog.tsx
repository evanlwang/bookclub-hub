"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

export interface MeetingEditableFields {
  title: string;
  description: string;
  location: string;
}

export function EditMeetingDialog({
  initial,
  submitting,
  error,
  onSave,
  onCancel,
}: {
  initial: MeetingEditableFields;
  submitting: boolean;
  error: string;
  onSave: (next: MeetingEditableFields) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, true);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [location, setLocation] = useState(initial.location);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onCancel]);

  const dirty =
    title.trim() !== initial.title ||
    description.trim() !== initial.description ||
    location.trim() !== initial.location;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || submitting) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
    });
  }

  return (
    <div
      ref={dialogRef}
      data-testid="edit-meeting-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-meeting-title"
      tabIndex={-1}
      className="fixed inset-0 backdrop-blur-md bg-bg/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <Card className="w-full max-w-md bg-bg p-6 rounded-[var(--radius-lg)] shadow-lg">
        <h2
          id="edit-meeting-title"
          className="font-[var(--font-display)] text-lg font-semibold text-ink mb-4"
        >
          Edit meeting
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="edit-meeting-title-input"
              className="block text-[13px] font-medium text-ink-2 mb-1"
            >
              Title
            </label>
            <input
              id="edit-meeting-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              data-testid="edit-meeting-title-input"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="edit-meeting-location-input"
              className="block text-[13px] font-medium text-ink-2 mb-1"
            >
              Location
            </label>
            <input
              id="edit-meeting-location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
              data-testid="edit-meeting-location-input"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="edit-meeting-description-input"
              className="block text-[13px] font-medium text-ink-2 mb-1"
            >
              Description
            </label>
            <textarea
              id="edit-meeting-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional"
              data-testid="edit-meeting-description-input"
              className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink placeholder:text-ink-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-vertical"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border"
              style={{ borderColor: "var(--color-danger-line)" }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={!dirty || submitting}
              data-testid="edit-meeting-save"
            >
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
