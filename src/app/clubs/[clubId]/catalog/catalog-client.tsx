// @spec CAT-UI-SEARCH-001, CAT-UI-RESULTS-001, CAT-UI-PAGER-001,
//        CAT-UI-EMPTY-001, CAT-UI-ERROR-001, CAT-UI-LOADING-001,
//        CAT-UI-NOM-001, CAT-UI-NOM-002
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { SearchIcon } from "@/components/ui/icons";
import type {
  CatalogBook,
  CatalogBookDetail,
} from "@/server/routers/catalog";
import { CatalogResultCard } from "./catalog-result-card";
import { CatalogDetailPanel } from "./catalog-detail-panel";
import { SkeletonGrid } from "./skeleton-grid";

interface CatalogClientProps {
  clubId: string;
  nominatingRoundId: string | null;
}

interface SearchPayload {
  results: CatalogBook[];
  page: number;
  limit: number;
  totalEstimate: number;
  source: "open-library" | "cache";
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

// @spec CAT-UI-ISBN-001
function detectIsbn(query: string): string | null {
  const stripped = query.replace(/[\s-]/g, "");
  return /^(\d{10}|\d{13})$/.test(stripped) ? stripped : null;
}

export function CatalogClient({ clubId, nominatingRoundId }: CatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [hasFullPage, setHasFullPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"gateway" | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Per-card nominate state, keyed by openLibraryKey
  const [nominatingKey, setNominatingKey] = useState<string | null>(null);
  const [nominatedKeys, setNominatedKeys] = useState<Set<string>>(new Set());
  const [lastNominatedTitle, setLastNominatedTitle] = useState<string | null>(null);
  const [nominateError, setNominateError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const canNominate = nominatingRoundId !== null;

  // Sync (q, page) → URL.
  const syncUrl = useCallback(
    (q: string, p: number) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (p > 1) params.set("page", String(p));
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router]
  );

  // Debounce input → debouncedQuery; reset page to 1 on new query.
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  // Run the search whenever debouncedQuery or page changes.
  // Branches on ISBN-shape input (CAT-UI-ISBN-001).
  const isbn = useMemo(() => detectIsbn(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    syncUrl(debouncedQuery, page);

    if (debouncedQuery.length === 0) {
      setResults([]);
      setHasFullPage(false);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    // ISBN mode: single-card response, no pager.
    if (isbn) {
      fetch(
        `/api/trpc/catalog.searchByIsbn?input=${encodeURIComponent(
          JSON.stringify({ isbn })
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (requestId !== requestIdRef.current) return;
          if (data.error) {
            setError("gateway");
            return;
          }
          const hit = data.result?.data as CatalogBook | null;
          setResults(hit ? [hit] : []);
          setHasFullPage(false);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setError("gateway");
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return;
          setLoading(false);
        });
      return;
    }

    fetch(
      `/api/trpc/catalog.search?input=${encodeURIComponent(
        JSON.stringify({ query: debouncedQuery, page, limit: PAGE_SIZE })
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        // Drop responses from stale requests.
        if (requestId !== requestIdRef.current) return;
        if (data.error) {
          // Map BAD_GATEWAY → inline retry banner; everything else surfaces too.
          setError("gateway");
          return;
        }
        const payload = data.result?.data as SearchPayload | undefined;
        if (!payload) {
          setError("gateway");
          return;
        }
        // Keep prior results visible during loading per CAT-UI-LOADING-001 —
        // we only overwrite on a real response.
        setResults(payload.results);
        setHasFullPage(payload.results.length >= PAGE_SIZE);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setError("gateway");
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [debouncedQuery, isbn, page, syncUrl, retryNonce]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryNonce((n) => n + 1);
  }, []);

  const handleNominate = useCallback(
    async (book: CatalogBook | CatalogBookDetail) => {
      if (!nominatingRoundId) return;
      setNominatingKey(book.openLibraryKey);
      setNominateError(null);

      try {
        const importRes = await fetch("/api/trpc/books.importFromCatalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            openLibraryKey: book.openLibraryKey,
            title: book.title,
            authorNames: book.authorNames,
            isbn: book.isbn,
            coverUrl: book.coverUrl,
            pageCount: book.pageCount,
          }),
        });
        const importData = await importRes.json();
        if (importData.error) {
          throw new Error(importData.error.message ?? "Import failed");
        }
        const bookId = importData.result?.data?.bookId as string | undefined;
        if (!bookId) throw new Error("Import returned no bookId");

        const nomRes = await fetch("/api/trpc/nominations.create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clubId,
            roundId: nominatingRoundId,
            bookId,
          }),
        });
        const nomData = await nomRes.json();
        if (nomData.error) {
          // CONFLICT means the book is already nominated — treat as success.
          if (nomData.error.data?.code !== "CONFLICT") {
            throw new Error(nomData.error.message ?? "Nominate failed");
          }
        }

        setNominatedKeys((prev) => new Set(prev).add(book.openLibraryKey));
        setLastNominatedTitle(book.title);
      } catch (err) {
        setNominateError(err instanceof Error ? err.message : "Nominate failed");
      } finally {
        setNominatingKey(null);
      }
    },
    [clubId, nominatingRoundId]
  );

  const showSkeletons = loading && results.length === 0;
  const showResults = results.length > 0;
  const showEmpty = !loading && !error && debouncedQuery.length > 0 && results.length === 0;
  const showInitial = !loading && !error && debouncedQuery.length === 0;

  const headerHint = useMemo(() => {
    if (canNominate) return null;
    return (
      <p className="text-xs text-ink-3 mt-2" data-testid="catalog-no-active-round">
        Nominations open when your club starts a new round.
      </p>
    );
  }, [canNominate]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search by title, author, or paste an ISBN…"
          data-testid="catalog-search-input"
          aria-label="Search the book catalog"
          className="w-full pl-10 pr-24 py-2.5 rounded-md border border-line bg-bg placeholder-ink-3 text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20"
        />
        {/* CAT-UI-ISBN-003 */}
        {isbn && (
          <span
            data-testid="catalog-isbn-pill"
            className="absolute right-9 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-sunken text-ink-2 font-medium"
          >
            ISBN
          </span>
        )}
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-ink-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>
      {headerHint}

      {/* Success toast — inline, under the input */}
      {lastNominatedTitle && (
        <div
          data-testid="catalog-nominate-success"
          className="mt-3 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary-ink flex items-center justify-between gap-3"
        >
          <span>
            ✓ <span className="font-medium">{lastNominatedTitle}</span> nominated for current round.
          </span>
          <Link
            href={`/clubs/${clubId}/vote`}
            className="text-xs underline hover:no-underline shrink-0"
          >
            View round
          </Link>
        </div>
      )}
      {nominateError && (
        <p className="mt-3 text-sm text-danger" data-testid="catalog-nominate-error">
          {nominateError}
        </p>
      )}

      {/* Body */}
      <div className="mt-6">
        {error === "gateway" && (
          <div
            data-testid="catalog-error-banner"
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/5 p-4 flex items-center justify-between gap-3"
          >
            <p className="text-sm text-ink">
              Catalog is unavailable right now. Try again.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              data-testid="catalog-error-retry"
            >
              Retry
            </Button>
          </div>
        )}

        {showInitial && (
          <div className="rounded-[var(--radius-md)] border border-dashed border-line p-10 text-center">
            <p className="text-sm text-ink-2">
              Search for a book to start browsing.
            </p>
          </div>
        )}

        {showSkeletons && <SkeletonGrid count={6} />}

        {showResults && (
          <div
            data-testid="catalog-results-grid"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {results.map((book) => (
              <CatalogResultCard
                key={book.openLibraryKey}
                book={book}
                canNominate={canNominate}
                onOpenDetail={() => setSelectedKey(book.openLibraryKey)}
                onNominate={() => handleNominate(book)}
                nominating={nominatingKey === book.openLibraryKey}
                nominated={nominatedKeys.has(book.openLibraryKey)}
              />
            ))}
          </div>
        )}

        {showEmpty && (
          <div
            className="rounded-[var(--radius-md)] border border-line p-8 text-center"
            data-testid="catalog-empty-state"
          >
            <p className="text-sm text-ink-2">
              {isbn
                ? `No book found for ISBN ${isbn}.`
                : `No books matched “${debouncedQuery}”.`}
            </p>
            {canNominate && (
              <p className="text-xs text-ink-3 mt-2">
                You can also{" "}
                <Link
                  href={`/clubs/${clubId}/vote`}
                  className="text-primary underline hover:no-underline"
                >
                  enter a book manually
                </Link>{" "}
                from the voting page.
              </p>
            )}
          </div>
        )}

        {/* Pager — hidden in ISBN mode (single result only) */}
        {showResults && !isbn && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="catalog-pager-prev"
            >
              ← Previous
            </Button>
            <span className="text-xs text-ink-3" data-testid="catalog-pager-page">
              Page {page}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasFullPage || loading}
              onClick={() => setPage((p) => p + 1)}
              data-testid="catalog-pager-next"
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedKey && (
        <CatalogDetailPanel
          openLibraryKey={selectedKey}
          canNominate={canNominate}
          onClose={() => setSelectedKey(null)}
          onNominate={(detail) => handleNominate(detail)}
          nominating={nominatingKey === selectedKey}
          nominated={nominatedKeys.has(selectedKey)}
        />
      )}
    </div>
  );
}
