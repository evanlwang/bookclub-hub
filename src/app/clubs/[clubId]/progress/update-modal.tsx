"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ProgressBar, Sheet } from "@/components/ui";
import { clampPage } from "@/lib/progress/clamp-page";
import { BookmarkSlider } from "./bookmark";
import { trpc } from "@/trpc/react-hooks";

type ProgressStatus = "not_started" | "reading" | "finished";

type ProgressSnapshot = {
  currentPage?: number;
  percentage?: number;
  currentChapter?: number;
  status?: string;
  updatedAt?: Date | string;
};

interface UpdateModalProps {
  clubId: string;
  bookId: string;
  /** Known book length, or null when the book has no page count. */
  totalPages: number | null;
  currentProgress?: ProgressSnapshot;
}

const TOAST_DISMISS_MS = 4000;

// @spec PROG-UI-MODAL-OPEN-001, PROG-UI-MODAL-TOAST-001, PROG-UI-MODAL-UNDO-001, PROG-UI-MODAL-SLIDER-001, PROG-UI-MODAL-PCT-001, PROG-UI-MODAL-TIMESTAMP-001, PROG-UI-MODAL-PAGE-CLAMP-001, PROG-DASH-UNKNOWN-TOTAL-001
export function UpdateProgressButton(props: UpdateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [overrideProgress, setOverrideProgress] = useState<ProgressSnapshot | null>(null);
  const [toast, setToast] = useState<{
    savedPage: number | null;
    previous: ProgressSnapshot | null;
  } | null>(null);

  const undoMutation = trpc.progress.update.useMutation();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSaved(savedPage: number | null, previous: ProgressSnapshot | null) {
    setOpen(false);
    setOverrideProgress(null);
    setToast({ savedPage, previous });
    // Fire the dog-ear fold reward on the summary card (decoupled listener).
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dogear:saved"));
    }
  }

  async function handleUndo() {
    if (!toast) return;
    const previous = toast.previous;
    if (previous) {
      const status = previous.status ?? "not_started";
      // `progress.update.status` is typed as the enum — narrow defensively.
      const normalizedStatus: "not_started" | "reading" | "finished" =
        status === "reading" || status === "finished" ? status : "not_started";
      try {
        await undoMutation.mutateAsync({
          clubId: props.clubId,
          bookId: props.bookId,
          currentPage: previous.currentPage ?? 0,
          percentage: previous.percentage ?? 0,
          currentChapter: previous.currentChapter,
          status: normalizedStatus,
          ...(props.totalPages != null && { totalPages: props.totalPages }),
        });
      } catch {
        // Best-effort undo — failure here is non-blocking; the toast goes away.
      }
    }
    setToast(null);
    setOverrideProgress(previous);
    setOpen(true);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => {
          setOverrideProgress(null);
          setOpen(true);
        }}
        data-testid="update-progress-btn"
      >
        Move my bookmark
      </Button>
      {open && (
        <UpdateModal
          {...props}
          currentProgress={overrideProgress ?? props.currentProgress}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
      {toast && (
        <SavedToast
          savedPage={toast.savedPage}
          canUndo={toast.previous !== null}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

function UpdateModal({
  clubId,
  bookId,
  totalPages,
  currentProgress,
  onClose,
  onSaved,
}: UpdateModalProps & {
  onClose: () => void;
  onSaved: (savedPage: number | null, previous: ProgressSnapshot | null) => void;
}) {
  const router = useRouter();
  const [page, setPage] = useState(currentProgress?.currentPage ?? 0);
  const [chapter, setChapter] = useState(currentProgress?.currentChapter ?? 0);
  const [status, setStatus] = useState<string>(
    currentProgress?.status ?? "not_started"
  );
  const [error, setError] = useState("");
  const updateMutation = trpc.progress.update.useMutation();
  const loading = updateMutation.isPending;

  const knownPages = totalPages != null && totalPages > 0;
  const percentage =
    status === "finished"
      ? 100
      : knownPages
        ? Math.min(100, Math.round((page / (totalPages as number)) * 100))
        : 0;

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    if (newStatus === "finished") {
      setPage(totalPages ?? 0);
    } else if (newStatus === "not_started") {
      setPage(0);
    }
  }

  // @spec PROG-UI-MODAL-PAGE-CLAMP-001
  function handlePageChange(value: number) {
    const clamped = clampPage(value, totalPages);
    setPage(clamped);
    if (clamped > 0 && status === "not_started") {
      setStatus("reading");
    }
    // Mirror the server-side PROG-BE-006-AUTOFINISH rule so the status pill
    // flips instantly when the user reaches the last page. Without this, the
    // modal would show "Reading · 100%" until save, which contradicts the
    // dashboard's eventual "Finished" badge for the same numeric state.
    // @spec PROG-BE-006-AUTOFINISH
    if (
      knownPages &&
      clamped >= (totalPages as number) &&
      status !== "finished"
    ) {
      setStatus("finished");
    }
  }

  async function handleSave() {
    setError("");
    // `progress.update.status` is typed as the enum — narrow defensively.
    const normalizedStatus: "not_started" | "reading" | "finished" =
      status === "reading" || status === "finished" ? status : "not_started";
    try {
      await updateMutation.mutateAsync({
        clubId,
        bookId,
        currentPage: page,
        percentage,
        currentChapter: chapter || undefined,
        status: normalizedStatus,
        ...(totalPages != null && { totalPages }),
      });
      const savedPage = knownPages ? page : null;
      const previous: ProgressSnapshot | null = currentProgress
        ? {
            currentPage: currentProgress.currentPage,
            percentage: currentProgress.percentage,
            currentChapter: currentProgress.currentChapter,
            status: currentProgress.status,
          }
        : null;
      router.refresh();
      onSaved(savedPage, previous);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!loading}
      labelledById="update-progress-title"
      testId="progress-modal"
    >
        <h2
          id="update-progress-title"
          className="font-[var(--font-display)] text-xl font-semibold text-ink mb-6"
        >
          Where did you stop?
        </h2>
        <p className="font-[var(--font-serif)] italic text-sm text-ink-2 mb-5">
          {knownPages ? `${totalPages} pages` : "Record your page"}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {(
            [
              { value: "not_started", label: "Not started" },
              { value: "reading", label: "Reading" },
              { value: "finished", label: "Finished", sub: "fills to 100%" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              data-testid={`status-${opt.value}`}
              className={`rounded-[var(--radius-md)] border-2 px-1.5 py-2.5 text-center transition-all duration-150 cursor-pointer ${
                status === opt.value
                  ? "border-primary bg-primary-soft scale-[1.02]"
                  : "border-line bg-bg-soft hover:border-line-strong"
              }`}
            >
              <span
                className={`block font-[var(--font-display)] font-extrabold text-[13.5px] ${
                  status === opt.value ? "text-primary-ink" : "text-ink"
                }`}
              >
                {opt.label}
              </span>
              {"sub" in opt && opt.sub && (
                <span className="block text-[9.5px] font-[var(--font-display)] font-semibold text-ink-3 mt-0.5">
                  {opt.sub}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-4 mb-4">
          {knownPages && (
            <div className="shrink-0 w-[150px]">
              <BookmarkSlider
                pct={percentage}
                disabled={status === "finished"}
                onChange={(p) =>
                  handlePageChange(Math.round((p / 100) * (totalPages as number)))
                }
              />
              <p className="text-center mt-1.5 font-[var(--font-display)] font-bold text-[11px] text-ink-3">
                Drag the bookmark
              </p>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-3">
            <div>
              <label className="block font-[var(--font-display)] text-xs font-bold text-ink-2 mb-1">
                Page
              </label>
              <input
                type="number"
                min={0}
                {...(knownPages && { max: totalPages as number })}
                value={page}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                disabled={status === "finished"}
                data-testid="page-input"
                className="w-full text-lg font-[var(--font-mono)] font-bold bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft disabled:opacity-50"
              />
              {/* Visually hidden native range — keeps the control keyboard- and
                  test-accessible; the bookmark slider is the visible affordance. */}
              {knownPages && (
                <input
                  type="range"
                  min={0}
                  max={totalPages as number}
                  value={page}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  disabled={status === "finished"}
                  data-testid="page-slider"
                  aria-label="Current page"
                  className="sr-only"
                />
              )}
            </div>
            <div>
              <label className="block font-[var(--font-display)] text-xs font-bold text-ink-2 mb-1">
                Chapter <span className="font-semibold text-ink-3">(optional)</span>
              </label>
              <input
                type="number"
                min={0}
                value={chapter || ""}
                onChange={(e) => setChapter(Number(e.target.value))}
                data-testid="chapter-input"
                placeholder="—"
                className="w-full text-base font-[var(--font-mono)] font-bold bg-bg-soft border-2 border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
              />
            </div>
            <p className="font-[var(--font-display)] text-[11px] font-semibold leading-snug text-ink-3">
              Your chapter sets what discussions you see — notes past it stay tucked away.
            </p>
          </div>
        </div>

        <div
          data-testid="progress-preview-bar"
          data-percentage={percentage}
          data-status={status}
          className="mb-4 flex items-center gap-3"
        >
          <div className="flex-1">
            <ProgressBar percentage={percentage} status={status as ProgressStatus} />
          </div>
          <span
            data-testid="percentage-display"
            className="font-[var(--font-display)] font-extrabold text-base text-primary min-w-[42px] text-right"
          >
            {percentage}%
          </span>
        </div>

        {currentProgress?.updatedAt && (
          <p
            data-testid="last-updated"
            className="text-xs text-ink-3 mb-4"
          >
            Last updated {formatLastUpdated(currentProgress.updatedAt)}
          </p>
        )}

        {error && (
          <p className="text-sm text-danger mb-4" data-testid="modal-error">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={handleSave}
            data-testid="save-progress-btn"
            className="flex-1"
          >
            Save my place
          </Button>
        </div>
    </Sheet>
  );
}

function formatLastUpdated(value: Date | string): string {
  const d = new Date(value);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function SavedToast({
  savedPage,
  canUndo,
  onUndo,
  onDismiss,
}: {
  savedPage: number | null;
  canUndo: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const message =
    savedPage != null ? `Progress saved · page ${savedPage}` : "Progress saved";

  return (
    <div
      data-testid="progress-saved-toast"
      role="status"
      // @spec TOUCH-TOAST-001 — lift above the mobile tab bar on phones.
      // Cozy redesign: dark ink card, paper text, amber Undo, springy pop-in.
      className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+0.75rem)] md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-2xl bg-ink text-bg shadow-lg animate-toast-pop"
    >
      <span className="font-[var(--font-display)] font-bold text-sm">{message}</span>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          data-testid="progress-undo-btn"
          className="font-[var(--font-display)] font-extrabold text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-bg/60 hover:text-bg transition-colors text-sm leading-none"
      >
        ×
      </button>
    </div>
  );
}
