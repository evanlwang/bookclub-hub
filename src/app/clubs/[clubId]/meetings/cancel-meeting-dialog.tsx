"use client";

import { useEffect, useRef } from "react";
import { Button, Card } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onCancel]);

  return (
    <div
      ref={dialogRef}
      data-testid="cancel-meeting-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-meeting-title"
      tabIndex={-1}
      className="fixed inset-0 backdrop-blur-md bg-bg/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <Card className="w-full max-w-md bg-bg p-6 rounded-[var(--radius-lg)] shadow-lg">
        <h2
          id="cancel-meeting-title"
          className="font-[var(--font-display)] text-lg font-semibold text-ink mb-2"
        >
          Cancel “{meetingTitle}”?
        </h2>
        <p className="text-sm text-ink-2 mb-4">
          Members will be emailed. The meeting will move to the cancelled list
          and stop accepting responses.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 mb-4 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border"
            style={{ borderColor: "oklch(0.88 0.04 25)" }}
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
      </Card>
    </div>
  );
}
