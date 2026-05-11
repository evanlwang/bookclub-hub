"use client";

import { Button, BookCover } from "@/components/ui";
import { type Book, NOMINATE_INPUT_CLASS } from "./nominate-modal-types";

interface NominateSearchProps {
  query: string;
  debouncedQuery: string;
  results: Book[];
  isSearching: boolean;
  searchError: string;
  submitting: boolean;
  onQueryChange: (value: string) => void;
  onNominate: (bookId: string) => void;
}

// @spec VOTE-UI-NOMMODAL-003
export function NominateSearch({
  query,
  debouncedQuery,
  results,
  isSearching,
  searchError,
  submitting,
  onQueryChange,
  onNominate,
}: NominateSearchProps) {
  // Suppress while a search is queued (user typed since last completed search)
  // or in-flight — otherwise the prior empty result flashes against new input.
  const noMatches =
    debouncedQuery.length > 0 &&
    query === debouncedQuery &&
    results.length === 0 &&
    !isSearching &&
    !searchError;

  return (
    <>
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search by title or author..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={`${NOMINATE_INPUT_CLASS} border-line`}
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

      {results.length > 0 && (
        <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
          {results.map((book) => (
            <div
              key={book.id}
              className="p-3 rounded-md border border-line hover:border-line-strong hover:bg-bg-soft transition-colors cursor-pointer flex gap-3 items-center"
              onClick={() => onNominate(book.id)}
            >
              <BookCover
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                size="sm"
              />
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
                  onNominate(book.id);
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
    </>
  );
}
