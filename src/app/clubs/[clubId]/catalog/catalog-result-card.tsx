// @spec CAT-UI-RESULTS-001, CAT-UI-NOM-002
"use client";

import { Button } from "@/components/ui";
import type { CatalogBook } from "@/server/routers/catalog";

interface CatalogResultCardProps {
  book: CatalogBook;
  canNominate: boolean;
  onOpenDetail: () => void;
  onNominate: () => void;
  nominating: boolean;
  nominated: boolean;
}

export function CatalogResultCard({
  book,
  canNominate,
  onOpenDetail,
  onNominate,
  nominating,
  nominated,
}: CatalogResultCardProps) {
  return (
    <div
      data-testid="catalog-result-card"
      data-key={book.openLibraryKey}
      className="flex flex-col rounded-[var(--radius-md)] border border-line bg-bg p-3 hover:border-line-strong transition-colors"
    >
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`Open details for ${book.title}`}
        className="block aspect-[2/3] w-full rounded-sm bg-bg-sunken overflow-hidden cursor-pointer"
      >
        {book.coverUrl ? (
          // Plain img — Open Library covers are external; Next/Image would
          // require remotePatterns config. Fine for v1.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt={`Cover for ${book.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex w-full h-full items-center justify-center text-3xl text-ink-3">
            📖
          </span>
        )}
      </button>

      <div className="mt-3 flex-1">
        <p
          className="text-sm font-medium text-ink leading-snug overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          title={book.title}
        >
          {book.title}
        </p>
        <p className="text-xs text-ink-3 italic mt-1 truncate">
          {book.authorNames.length > 0 ? book.authorNames.join(" · ") : "Unknown author"}
        </p>
        {book.firstPublishYear !== null && (
          <p className="text-xs text-ink-3 mt-0.5">{book.firstPublishYear}</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenDetail}
          data-testid="catalog-card-details"
          className="flex-1"
        >
          Details
        </Button>
        {canNominate ? (
          <Button
            variant={nominated ? "secondary" : "primary"}
            size="sm"
            onClick={onNominate}
            loading={nominating}
            disabled={nominated}
            data-testid="catalog-card-nominate"
            className="flex-1"
          >
            {nominated ? "✓ Nominated" : "Nominate"}
          </Button>
        ) : (
          <span className="flex-1 text-[11px] text-ink-3 text-center">
            No active round
          </span>
        )}
      </div>
    </div>
  );
}
