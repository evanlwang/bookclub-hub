"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { trpc } from "@/trpc/react-hooks";
import { type Book, type FormErrors } from "./nominate-modal-types";
import { NominateSearch } from "./nominate-search";
import { NominatePitch } from "./nominate-pitch";
import { NominateManualForm } from "./nominate-manual-form";

interface NominateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  roundId: string;
  onNominationSuccess?: () => void;
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

  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");
  const [pitch, setPitch] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [submitError, setSubmitError] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");

  const manualTitleDirty = useRef(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Debounce the search query: any time `query` changes, schedule a 300ms
  // timer to copy it into `debouncedQuery` (which is what feeds the useQuery
  // below). useQuery cancels in-flight requests automatically when its input
  // changes, replacing the old AbortController dance.
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = trpc.books.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 },
  );
  const results: Book[] = (searchQuery.data as Book[] | undefined) ?? [];
  const isSearching =
    debouncedQuery.length > 0 && (searchQuery.isPending || searchQuery.isFetching);
  const searchError = searchQuery.isError
    ? "Search is unavailable — add the book manually below."
    : "";

  useEffect(() => {
    if (
      !manualTitleDirty.current &&
      debouncedQuery.length > 0 &&
      results.length === 0 &&
      !isSearching &&
      !searchQuery.isError
    ) {
      setManualTitle(debouncedQuery);
    }
  }, [debouncedQuery, results.length, isSearching, searchQuery.isError]);

  useEffect(() => {
    if (isOpen) return;
    setQuery("");
    setDebouncedQuery("");
    setManualTitle("");
    setManualAuthor("");
    setManualIsbn("");
    setManualPageCount("");
    setPitch("");
    setFormErrors({});
    setSubmitError("");
    manualTitleDirty.current = false;
  }, [isOpen]);

  const createManualBook = trpc.books.createManual.useMutation();
  const createNomination = trpc.nominations.create.useMutation();

  const submitting = createManualBook.isPending || createNomination.isPending;

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
    // Defense-in-depth: a recent bug let this run with an empty `roundId`,
    // crashing the Zod uuid check on the server. Keep this guard.
    if (!roundId) {
      setSubmitError("No active voting round — start one before nominating.");
      return;
    }
    setSubmitError("");
    try {
      const trimmedPitch = pitch.trim();
      await createNomination.mutateAsync({
        clubId,
        roundId,
        bookId,
        ...(trimmedPitch ? { pitch: trimmedPitch } : {}),
      });
      onClose();
      onNominationSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to nominate book. It may have already been nominated.";
      setSubmitError(
        message ||
          "Failed to nominate book. It may have already been nominated."
      );
    }
  }

  async function handleCreateAndNominate() {
    const errs = validateManual();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    // Defense-in-depth: a recent bug let this run with an empty `roundId`,
    // crashing the Zod uuid check on the server. Keep this guard.
    if (!roundId) {
      setSubmitError("No active voting round — start one before nominating.");
      return;
    }
    setFormErrors({});
    setSubmitError("");

    try {
      const createResult = await createManualBook.mutateAsync({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
        isbn: manualIsbn.trim() || undefined,
        pageCount: parseInt(manualPageCount, 10),
      });
      const book = createResult?.book;
      if (!book) {
        setSubmitError("Failed to create book");
        return;
      }

      const trimmedPitch = pitch.trim();
      await createNomination.mutateAsync({
        clubId,
        roundId,
        bookId: book.id,
        ...(trimmedPitch ? { pitch: trimmedPitch } : {}),
      });
      onClose();
      onNominationSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to nominate book";
      setSubmitError(message || "Failed to nominate book");
    }
  }

  if (!isOpen) return null;

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

        <NominateSearch
          query={query}
          debouncedQuery={debouncedQuery}
          results={results}
          isSearching={isSearching}
          searchError={searchError}
          submitting={submitting}
          onQueryChange={handleQueryChange}
          onNominate={handleNominate}
        />

        <NominatePitch value={pitch} onChange={setPitch} />

        <NominateManualForm
          title={manualTitle}
          author={manualAuthor}
          isbn={manualIsbn}
          pageCount={manualPageCount}
          formErrors={formErrors}
          submitting={submitting}
          submitError={submitError}
          onTitleChange={(v) => {
            manualTitleDirty.current = true;
            setManualTitle(v);
          }}
          onAuthorChange={setManualAuthor}
          onIsbnChange={setManualIsbn}
          onPageCountChange={setManualPageCount}
          onClearFieldError={(field) =>
            setFormErrors((p) => ({ ...p, [field]: undefined }))
          }
          onSubmit={handleCreateAndNominate}
        />
      </Card>
    </div>
  );
}
