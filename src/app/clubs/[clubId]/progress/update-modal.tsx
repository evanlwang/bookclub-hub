"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ProgressBar } from "@/components/ui";

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
  totalPages: number;
  currentProgress?: ProgressSnapshot;
}

const TOAST_DISMISS_MS = 4000;

// @spec PROG-UI-MODAL-OPEN-001, PROG-UI-MODAL-TOAST-001, PROG-UI-MODAL-UNDO-001, PROG-UI-MODAL-SLIDER-001, PROG-UI-MODAL-PCT-EDIT-001, PROG-UI-MODAL-TIMESTAMP-001
export function UpdateProgressButton(props: UpdateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [overrideProgress, setOverrideProgress] = useState<ProgressSnapshot | null>(null);
  const [toast, setToast] = useState<{
    savedPage: number | null;
    previous: ProgressSnapshot | null;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast]);

  function handleSaved(savedPage: number | null, previous: ProgressSnapshot | null) {
    setOpen(false);
    setOverrideProgress(null);
    setToast({ savedPage, previous });
  }

  async function handleUndo() {
    if (!toast) return;
    const previous = toast.previous;
    if (previous) {
      await fetch("/api/trpc/progress.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId: props.clubId,
          bookId: props.bookId,
          currentPage: previous.currentPage ?? 0,
          percentage: previous.percentage ?? 0,
          currentChapter: previous.currentChapter,
          status: previous.status ?? "not_started",
          totalPages: props.totalPages,
        }),
      });
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
        Update My Progress
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
  const [pctOverride, setPctOverride] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const percentage =
    status === "finished"
      ? 100
      : pctOverride !== null
        ? pctOverride
        : totalPages > 0
          ? Math.min(100, Math.round((page / totalPages) * 100))
          : 0;

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setPctOverride(null);
    if (newStatus === "finished") {
      setPage(totalPages);
    } else if (newStatus === "not_started") {
      setPage(0);
    }
  }

  function handlePageChange(value: number) {
    setPctOverride(null);
    setPage(value);
    if (value > 0 && status === "not_started") {
      setStatus("reading");
    }
  }

  function handlePercentageChange(rawValue: number) {
    const pct = Math.max(0, Math.min(100, isNaN(rawValue) ? 0 : rawValue));
    if (totalPages > 0) {
      setPctOverride(null);
      setPage(Math.round((pct / 100) * totalPages));
    } else {
      setPctOverride(pct);
    }
    if (pct > 0 && status === "not_started") {
      setStatus("reading");
    }
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/progress.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          bookId,
          currentPage: page,
          percentage,
          currentChapter: chapter || undefined,
          status,
          totalPages,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.message || "Failed to save");
      } else {
        const savedPage = totalPages > 0 ? page : null;
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
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="progress-modal"
    >
      <div
        className="absolute inset-0 backdrop-blur-md bg-bg/40"
        onClick={onClose}
      />
      <div className="relative bg-bg border border-line rounded-[var(--radius-xl)] shadow-lg p-6 w-full max-w-md mx-4 animate-slide-down">
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-ink mb-6">
          Update Progress
        </h2>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {(
            [
              { value: "not_started", label: "Not Started" },
              { value: "reading", label: "Reading" },
              { value: "finished", label: "Finished" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              data-testid={`status-${opt.value}`}
              className={`p-3 rounded-[var(--radius-md)] border text-sm font-medium text-center transition-all duration-150 cursor-pointer ${
                status === opt.value
                  ? "border-primary bg-primary-soft text-primary-ink"
                  : "border-line bg-bg-soft text-ink-2 hover:border-line-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
            Current Page
          </label>
          <input
            type="number"
            min={0}
            max={totalPages}
            value={page}
            onChange={(e) => handlePageChange(Number(e.target.value))}
            disabled={status === "finished"}
            data-testid="page-input"
            className="w-full text-lg font-[var(--font-mono)] bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
          />
          <input
            type="range"
            min={0}
            max={totalPages}
            value={page}
            onChange={(e) => handlePageChange(Number(e.target.value))}
            disabled={status === "finished"}
            data-testid="page-slider"
            aria-label="Current page"
            className="w-full mt-2.5 accent-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          />
          <p className="text-xs text-ink-3 mt-1.5">
            of {totalPages} pages
          </p>
        </div>

        <div
          data-testid="progress-preview-bar"
          data-percentage={percentage}
          data-status={status}
          className="mb-4 p-3 bg-bg-soft rounded-[var(--radius-md)] border border-line"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-2">Progress</span>
            <div data-testid="percentage-display" className="flex items-center">
              <input
                type="number"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                disabled={status === "finished"}
                data-testid="percentage-input"
                aria-label="Progress percentage"
                className="w-14 text-right text-lg font-semibold text-ink font-[var(--font-mono)] bg-transparent border border-transparent rounded px-1 focus:outline-none focus:border-primary focus:bg-bg disabled:opacity-60"
              />
              <span className="text-lg font-semibold text-ink-2 font-[var(--font-mono)]">%</span>
            </div>
          </div>
          <ProgressBar percentage={percentage} status={status as ProgressStatus} />
        </div>

        <div className="mb-4">
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
            Chapter (optional)
          </label>
          <input
            type="number"
            min={0}
            value={chapter || ""}
            onChange={(e) => setChapter(Number(e.target.value))}
            data-testid="chapter-input"
            placeholder="—"
            className="w-24 text-sm bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2 text-ink text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
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
          >
            Save Progress
          </Button>
        </div>
      </div>
    </div>
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-line bg-bg shadow-lg animate-slide-up"
    >
      <span className="text-sm text-ink">{message}</span>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          data-testid="progress-undo-btn"
          className="text-sm font-medium text-primary hover:text-primary-ink transition-colors"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-ink-3 hover:text-ink transition-colors text-sm leading-none"
      >
        ×
      </button>
    </div>
  );
}
