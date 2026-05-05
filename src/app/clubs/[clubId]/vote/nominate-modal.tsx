"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Card } from "@/components/ui";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
}

interface NominateModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  roundId: string;
  onNominationSuccess?: () => void;
}

// @spec VOTE-API-009-MANUAL, VOTE-API-005-MANUAL
export function NominateModal({
  isOpen,
  onClose,
  clubId,
  roundId,
  onNominationSuccess,
}: NominateModalProps) {
  const [query, setQuery] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Manual form state
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [manualPageCount, setManualPageCount] = useState("");

  // Debounce search with 300ms delay
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        setDebouncedQuery(value);
      }, 300);

      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  // Search books when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setApiError("");

    fetch("/api/trpc/books.search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: debouncedQuery }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setResults([]);
          setApiError("Search failed. Try entering manually.");
        } else {
          setResults(data.result?.data || []);
        }
      })
      .catch(() => {
        setResults([]);
        setApiError("Search failed. Try entering manually.");
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery]);

  const handleNominate = async (bookId: string) => {
    setLoading(true);
    setApiError("");
    try {
      const res = await fetch("/api/trpc/nominations.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roundId,
          bookId,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setApiError(
          data.error.message ||
            "Failed to nominate book. It may have already been nominated."
        );
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
        if (onNominationSuccess) {
          onNominationSuccess();
        }
      }
    } catch (error) {
      setLoading(false);
      setApiError("Something went wrong");
    }
  };

  const handleCreateAndNominate = async () => {
    if (!manualTitle.trim() || !manualAuthor.trim()) {
      setApiError("Title and author are required");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      // Create book
      const createRes = await fetch("/api/trpc/books.createManual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle.trim(),
          author: manualAuthor.trim(),
          isbn: manualIsbn.trim() || undefined,
          pageCount: manualPageCount ? parseInt(manualPageCount, 10) : undefined,
        }),
      });

      const createData = await createRes.json();
      if (createData.error) {
        setApiError(createData.error.message || "Failed to create book");
        setLoading(false);
        return;
      }

      const book = createData.result?.data?.book;
      if (!book) {
        setApiError("Failed to create book");
        setLoading(false);
        return;
      }

      // Nominate it
      const nomRes = await fetch("/api/trpc/nominations.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          roundId,
          bookId: book.id,
        }),
      });

      const nomData = await nomRes.json();
      if (nomData.error) {
        setApiError(nomData.error.message || "Failed to nominate book");
        setLoading(false);
      } else {
        setLoading(false);
        onClose();
        if (onNominationSuccess) {
          onNominationSuccess();
        }
      }
    } catch (error) {
      setLoading(false);
      setApiError("Something went wrong");
    }
  };

  const showEmptyState = debouncedQuery.length > 0 && results.length === 0;
  const hasSearchError = debouncedQuery.length > 0 && results.length === 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md bg-bg p-6 rounded-[var(--radius-lg)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-[var(--font-display)] text-lg font-semibold text-ink">
            Nominate a Book
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

        {!showManualForm ? (
          <>
            {/* Search input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
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

            {/* Results list */}
            {results.length > 0 && (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {results.map((book) => (
                  <div
                    key={book.id}
                    className="p-3 rounded-md border border-line hover:border-line-strong hover:bg-bg-soft transition-colors cursor-pointer flex gap-3 items-start"
                    onClick={() => handleNominate(book.id)}
                  >
                    <div className="shrink-0 w-10 h-14 rounded bg-bg-soft flex items-center justify-center">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover rounded" />
                      ) : (
                        <span className="text-2xl">📖</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{book.title}</p>
                      <p className="text-xs text-ink-3 italic truncate">by {book.author}</p>
                      {book.pageCount && (
                        <p className="text-xs text-ink-3 mt-1">{book.pageCount}pp</p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNominate(book.id);
                      }}
                      loading={loading}
                    >
                      Nominate
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state with manual fallback */}
            {showEmptyState && (
              <div className="text-center py-6 mb-4">
                <p className="text-sm text-ink-3 mb-3">No books found</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowManualForm(true);
                    setQuery("");
                    setDebouncedQuery("");
                  }}
                >
                  Enter manually
                </Button>
              </div>
            )}

            {/* Error message */}
            {apiError && <p className="text-sm text-danger mb-3">{apiError}</p>}

            {/* Close button */}
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Manual form */}
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="The Midnight Library"
                  className="w-full px-4 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Author
                </label>
                <input
                  type="text"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                  placeholder="Matt Haig"
                  className="w-full px-4 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  ISBN (optional)
                </label>
                <input
                  type="text"
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  placeholder="978-0-857-52277-7"
                  className="w-full px-4 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1.5">
                  Page Count (optional)
                </label>
                <input
                  type="number"
                  value={manualPageCount}
                  onChange={(e) => setManualPageCount(e.target.value)}
                  placeholder="304"
                  className="w-full px-4 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
                />
              </div>
            </div>

            {/* Error message */}
            {apiError && <p className="text-sm text-danger mb-3">{apiError}</p>}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setShowManualForm(false);
                  setManualTitle("");
                  setManualAuthor("");
                  setManualIsbn("");
                  setManualPageCount("");
                  setApiError("");
                }}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                loading={loading}
                onClick={handleCreateAndNominate}
              >
                Create & Nominate
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
