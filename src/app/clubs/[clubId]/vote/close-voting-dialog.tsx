// @spec VOTE-UI-CLOSE-003, VOTE-UI-CLOSE-004, VOTE-UI-CLOSE-005, VOTE-UI-CLOSE-006
"use client";

import { Button, Sheet } from "@/components/ui";

export interface ClosePreview {
  top3: Array<{ id: string; title: string; author: string; voteCount: number }>;
  totalVotes: number;
  tiedAtTop: number;
}

export function CloseVotingDialog({
  preview,
  submitting,
  error,
  onConfirm,
  onCancel,
}: {
  preview: ClosePreview;
  submitting: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const leader = preview.top3[0];
  const showTieNote = leader && preview.tiedAtTop > 1;

  return (
    <Sheet
      open
      onClose={onCancel}
      dismissible={!submitting}
      labelledById="close-voting-title"
      testId="close-voting-dialog"
    >
        <h2
          id="close-voting-title"
          className="font-[var(--font-display)] text-lg font-semibold text-ink mb-2"
        >
          Close voting & reveal winner?
        </h2>
        <p className="text-sm text-ink-2 mb-4">
          This is irreversible. The leader below will become the club&apos;s current book.
        </p>

        <div className="mb-5">
          <p className="text-xs uppercase tracking-wider text-ink-3 mb-2">
            Standings ({preview.totalVotes} approval{preview.totalVotes === 1 ? "" : "s"} cast)
          </p>
          <ol className="space-y-2">
            {preview.top3.map((nom, i) => (
              <li
                key={nom.id}
                data-testid={`close-preview-row-${i}`}
                className={`flex items-baseline gap-3 p-3 rounded-[var(--radius-md)] ${
                  i === 0 ? "bg-primary-soft border border-primary/30" : "bg-bg-soft"
                }`}
              >
                <span className="font-[var(--font-mono)] text-xs text-ink-3 w-5">
                  {i === 0 ? "①" : `0${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{nom.title}</p>
                  <p className="text-xs text-ink-3 italic truncate">by {nom.author}</p>
                  {i === 0 && (
                    <p
                      data-testid="close-preview-leader-tag"
                      className="text-[11px] text-primary-ink font-medium mt-0.5"
                    >
                      Will become the current book
                      {showTieNote && (
                        <span
                          data-testid="close-preview-tie-note"
                          className="text-ink-3 font-normal"
                        >
                          {" "}
                          · Tied with {preview.tiedAtTop - 1} other
                          {preview.tiedAtTop - 1 === 1 ? "" : "s"} — earliest nomination wins
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-sm font-[var(--font-mono)] tabular-nums text-ink-2">
                  {nom.voteCount}
                </span>
              </li>
            ))}
          </ol>
        </div>

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
            Keep voting open
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onConfirm}
            disabled={submitting}
            data-testid="close-voting-confirm"
          >
            {submitting ? "Closing…" : "Close voting"}
          </Button>
        </div>
    </Sheet>
  );
}

// @spec VOTE-UI-CANCEL-002
export function CancelRoundDialog({
  submitting,
  error,
  confirmText,
  onConfirmTextChange,
  onConfirm,
  onCancel,
}: {
  submitting: boolean;
  error: string;
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onCancel}
      dismissible={!submitting}
      labelledById="cancel-round-title"
      testId="cancel-round-dialog"
    >
        <h2
          id="cancel-round-title"
          className="font-[var(--font-display)] text-lg font-semibold text-ink mb-2"
        >
          Cancel this round?
        </h2>
        <p className="text-sm text-ink-2 mb-4">
          All nominations and votes will be deleted. This cannot be undone.
        </p>
        <label
          htmlFor="cancel-confirm"
          className="block text-[13px] font-medium text-ink-2 mb-1.5"
        >
          Type <span className="font-semibold text-ink">cancel</span> to confirm
        </label>
        <input
          id="cancel-confirm"
          data-testid="cancel-confirm-input"
          type="text"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          className="w-full text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 mb-4"
          autoFocus
        />

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
            Keep round
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onConfirm}
            disabled={submitting || confirmText.trim().toLowerCase() !== "cancel"}
            data-testid="cancel-round-confirm"
          >
            {submitting ? "Cancelling…" : "Cancel round"}
          </Button>
        </div>
    </Sheet>
  );
}
