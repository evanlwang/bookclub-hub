"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
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
  const [results, setResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");
  const [pitch, setPitch] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

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

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => setDebouncedQuery(value), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setResults([]);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");

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
