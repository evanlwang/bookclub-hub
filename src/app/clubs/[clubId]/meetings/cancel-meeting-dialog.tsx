"use client";

import { Button, Sheet } from "@/components/ui";

export function CancelMeetingDialog({
  meetingTitle,
  submitting,
  error,
  onConfirm,
  onCancel,
}: {
  meetingTitle: string;
  submitting: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onCancel}
      dismissible={!submitting}
      labelledById="cancel-meeting-title"
      testId="cancel-meeting-dialog"
    >
      <h2
        id="cancel-meeting-title"
        className="font-[var(--font-display)] text-lg font-semibold text-ink mb-2"
      >
        Cancel “{meetingTitle}”?
      </h2>
      <p className="text-sm text-ink-2 mb-4">
        Members will be emailed. The meeting will move to the cancelled list and
        stop accepting responses.
      </p>

      {error && (
        <div
          role="alert"
          className="p-3 mb-4 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border"
          style={{ borderColor: "var(--color-danger-line)" }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="flex-1"
          onClick={onCancel}
          disabled={submitting}
        >
          Keep it
        </Button>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-1"
          onClick={onConfirm}
          disabled={submitting}
          data-testid="cancel-meeting-confirm"
        >
          {submitting ? "Cancelling…" : "Cancel meeting"}
        </Button>
      </div>
    </Sheet>
  );
}
