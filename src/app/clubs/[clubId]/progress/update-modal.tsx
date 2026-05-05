"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface UpdateModalProps {
  clubId: string;
  bookId: string;
  totalPages: number;
  currentProgress?: {
    currentPage?: number;
    percentage?: number;
    currentChapter?: number;
    status?: string;
  };
}

export function UpdateProgressButton(props: UpdateModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        data-testid="update-progress-btn"
      >
        Update My Progress
      </Button>
      {open && <UpdateModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function UpdateModal({
  clubId,
  bookId,
  totalPages,
  currentProgress,
  onClose,
}: UpdateModalProps & { onClose: () => void }) {
  const router = useRouter();
  const [page, setPage] = useState(currentProgress?.currentPage ?? 0);
  const [chapter, setChapter] = useState(currentProgress?.currentChapter ?? 0);
  const [status, setStatus] = useState<string>(
    currentProgress?.status ?? "not_started"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const percentage =
    status === "finished"
      ? 100
      : totalPages > 0
        ? Math.min(100, Math.round((page / totalPages) * 100))
        : 0;

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    if (newStatus === "finished") {
      setPage(totalPages);
    } else if (newStatus === "not_started") {
      setPage(0);
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
        router.refresh();
        onClose();
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-bg border border-line rounded-[var(--radius-xl)] shadow-lg p-6 w-full max-w-md mx-4 animate-slide-down">
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-ink mb-6">
          Update Progress
        </h2>

        {/* Status radio cards */}
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

        {/* Page input */}
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
            Current Page
          </label>
          <input
            type="number"
            min={0}
            max={totalPages}
            value={page}
            onChange={(e) => {
              setPage(Number(e.target.value));
              if (Number(e.target.value) > 0 && status === "not_started") {
                setStatus("reading");
              }
            }}
            disabled={status === "finished"}
            data-testid="page-input"
            className="w-full text-lg font-[var(--font-mono)] bg-bg border border-line-strong rounded-[var(--radius-md)] px-3 py-2.5 text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
          />
          <p className="text-xs text-ink-3 mt-1.5">
            of {totalPages} pages
          </p>
        </div>

        {/* Percentage display */}
        <div className="mb-4 p-3 bg-bg-soft rounded-[var(--radius-md)] border border-line">
          <span className="text-sm text-ink-2">Progress: </span>
          <span
            className="text-lg font-semibold text-ink font-[var(--font-mono)]"
            data-testid="percentage-display"
          >
            {percentage}%
          </span>
        </div>

        {/* Chapter input */}
        <div className="mb-6">
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

        {error && (
          <p className="text-sm text-danger mb-4" data-testid="modal-error">
            {error}
          </p>
        )}

        {/* Actions */}
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
