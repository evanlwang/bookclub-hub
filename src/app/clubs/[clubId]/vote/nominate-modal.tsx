"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button, Card } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";

interface Book {
  id: string;
  title: string;
  author: string;
  pageCount?: number;
}

interface NominateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  roundId: string;
  onNominationSuccess?: () => void;
}

interface FormErrors {
  title?: string;
  author?: string;
  pageCount?: string;
}

// @spec VOTE-API-009-MANUAL, VOTE-API-005-MANUAL, VOTE-UI-NOMMODAL-PITCH-001
export function NominateModal({
  isOpen,
  onClose,
  clubId,
  roundId,
  onNominationSuccess,
}: NominateModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Manual form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");
  const [pitch, setPitch] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Submission state shared by both flows (per-row Nominate + manual Add).
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // True once the user has touched the manual Title input. We stop auto-filling
  // from the search query after that so we never clobber what they typed.
  const manualTitleDirty = useRef(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => setDebouncedQuery(value), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // Search books when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setResults([]);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    // books.search is a tRPC `.query()` — fetched via GET with input as a
    // URL-encoded JSON param.
    const input = encodeURIComponent(JSON.stringify({ query: debouncedQuery }));
    const controller = new AbortController();
    fetch(`/api/trpc/books.search?input=${input}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setResults([]);
          setSearchError("Search is unavailable — add the book manually below.");
        } else {
          setResults(data.result?.data || []);
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setResults([]);
        setSearchError("Search is unavailable — add the book manually below.");
      })
      .finally(() => setIsSearching(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  // Pre-fill manual Title from a no-results search query — only when the user
  // hasn't typed in the Title field themselves.
  useEffect(() => {
    if (
      !manualTitleDirty.current &&
      debouncedQuery.length > 0 &&
      results.length === 0 &&
      !isSearching
    ) {
      setManualTitle(debouncedQuery);
    }
  }, [debouncedQuery, results.length, isSearching]);

  // Reset everything when the modal closes so re-opening starts fresh.
  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setSearchError("");
    setManualTitle("");
    setManualAuthor("");
    setManualIsbn("");
    setManualPageCount("");
    setPitch("");
    setFormErrors({});
    setSubmitError("");
    manualTitleDirty.current = false;
  }, [isOpen]);

  function validateManual(): FormErrors {
    const errs: FormErrors = {};
    if (!manualTitle.trim()) errs.title = "Required";
    if (!manualAuthor.trim()) errs.author = "Required";
    const pc = parseInt(manualPageCount, 10);
    if (!Number.isInteger(pc) || pc <= 0 || String(pc) !== manualPageCount.trim()) {
      errs.pageCount = "Enter a positive whole number";
    }
    return errs;
  }

  async function handleNominate(bookId: string) {
    if (!roundId) {
      // Defense-in-depth — the modal should never be opened without a valid
      // round, but if it is, refuse to submit rather than firing a doomed
      // tRPC call that fails Zod uuid validation server-side.
      setSubmitError("No active voting round — start one before nominating.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const trimmedPitch = pitch.trim();
      const res = await fetch("/api/trpc/nominations.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roundId,
          bookId,
          ...(trimmedPitch ? { pitch: trimmedPitch } : {}),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSubmitError(
          data.error.message ||
            "Failed to nominate book. It may have already been nominated."
        );
      } else {
        onClose();
        onNominationSuccess?.();
      }
    } catch {
      setSubmitError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAndNominate() {
    const errs = validateManual();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    if (!roundId) {
      setSubmitError("No active voting round — start one before nominating.");
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    setSubmitError("");

    try {
      const createRes = await fetch("/api/trpc/books.createManual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle.trim(),
          author: manualAuthor.trim(),
          isbn: manualIsbn.trim() || undefined,
          pageCount: parseInt(manualPageCount, 10),
        }),
      });
      const createData = await createRes.json();
      if (createData.error) {
        setSubmitError(createData.error.message || "Failed to create book");
        setSubmitting(false);
        return;
      }
      const book = createData.result?.data?.book;
      if (!book) {
        setSubmitError("Failed to create book");
        setSubmitting(false);
        return;
      }

      const trimmedPitch = pitch.trim();
      const nomRes = await fetch("/api/trpc/nominations.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roundId,
          bookId: book.id,
          ...(trimmedPitch ? { pitch: trimmedPitch } : {}),
        }),
      });
      const nomData = await nomRes.json();
      if (nomData.error) {
        setSubmitError(nomData.error.message || "Failed to nominate book");
      } else {
        onClose();
        onNominationSuccess?.();
      }
    } catch {
      setSubmitError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // Suppress while a search is queued (user typed since last completed search)
  // or in-flight — otherwise the prior empty result flashes against new input.
  // @spec VOTE-UI-NOMMODAL-003
  const noMatches =
    debouncedQuery.length > 0 &&
    query === debouncedQuery &&
    results.length === 0 &&
    !isSearching &&
    !searchError;

  const inputClass =
    "w-full px-4 py-2.5 rounded-md border bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20";
  const fieldErrorClass = "text-xs text-danger mt-1";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nominate-modal-title"
      tabIndex={-1}
      className="fixed inset-0 backdrop-blur-md bg-bg/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md bg-bg p-6 rounded-[var(--radius-lg)] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="nominate-modal-title"
            className="font-[var(--font-display)] text-lg font-semibold text-ink"
          >
            Nominate a book
          </h2>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className={`${inputClass} border-line`}
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-ink-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>

        {searchError && (
          <p className="text-xs text-ink-3 mb-3">{searchError}</p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
            {results.map((book) => (
              <div
                key={book.id}
                className="p-3 rounded-md border border-line hover:border-line-strong hover:bg-bg-soft transition-colors cursor-pointer flex gap-3 items-center"
                onClick={() => handleNominate(book.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{book.title}</p>
                  <p className="text-xs text-ink-3 italic truncate">
                    by {book.author}
                    {book.pageCount ? ` · ${book.pageCount}pp` : ""}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNominate(book.id);
                  }}
                  loading={submitting}
                >
                  Nominate
                </Button>
              </div>
            ))}
          </div>
        )}

        {noMatches && (
          <p className="text-xs text-ink-3 mb-4">
            No matches for &ldquo;{debouncedQuery}&rdquo;. Add it manually below ↓
          </p>
        )}

        {/* Optional pitch — applies to whichever flow the user submits below.
            @spec VOTE-UI-NOMMODAL-PITCH-001 */}
        <div className="border-t border-line pt-4 mt-2">
          <label
            htmlFor="nominate-pitch"
            className="block text-xs font-medium text-ink-2 mb-1.5"
          >
            Why this book? <span className="text-ink-3 font-normal">(optional)</span>
          </label>
          <textarea
            id="nominate-pitch"
            data-testid="nominate-pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="A short pitch your club will see next to the nomination."
            className={`${inputClass} border-line resize-y`}
          />
          <p className="text-[11px] text-ink-3 mt-1">
            {pitch.length} / 500 characters
          </p>
        </div>

        {/* Manual entry — always visible */}
        <div className="border-t border-line pt-4 mt-2">
          <p className="text-xs uppercase tracking-wider text-ink-3 mb-3">
            Don&rsquo;t see it? Add it manually
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => {
                  manualTitleDirty.current = true;
                  setManualTitle(e.target.value);
                  if (formErrors.title) setFormErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="The Midnight Library"
                aria-invalid={!!formErrors.title}
                className={`${inputClass} ${formErrors.title ? "border-danger" : "border-line"}`}
              />
              {formErrors.title && <p className={fieldErrorClass}>{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Author
              </label>
              <input
                type="text"
                value={manualAuthor}
                onChange={(e) => {
                  setManualAuthor(e.target.value);
                  if (formErrors.author) setFormErrors((p) => ({ ...p, author: undefined }));
                }}
                placeholder="Matt Haig"
                aria-invalid={!!formErrors.author}
                className={`${inputClass} ${formErrors.author ? "border-danger" : "border-line"}`}
              />
              {formErrors.author && <p className={fieldErrorClass}>{formErrors.author}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Page count
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={manualPageCount}
                onChange={(e) => {
                  setManualPageCount(e.target.value);
                  if (formErrors.pageCount) setFormErrors((p) => ({ ...p, pageCount: undefined }));
                }}
                placeholder="304"
                aria-invalid={!!formErrors.pageCount}
                className={`${inputClass} ${formErrors.pageCount ? "border-danger" : "border-line"}`}
              />
              <p className="text-[11px] text-ink-3 mt-1">
                Used to track reading progress.
              </p>
              {formErrors.pageCount && <p className={fieldErrorClass}>{formErrors.pageCount}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                ISBN <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="978-0-857-52277-7"
                className={`${inputClass} border-line`}
              />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-danger mb-3" role="alert">
              {submitError}
            </p>
          )}

          <Button
            variant="primary"
            size="md"
            className="w-full"
            loading={submitting}
            onClick={handleCreateAndNominate}
          >
            Add &amp; Nominate
          </Button>
        </div>
      </Card>
    </div>
  );
}
