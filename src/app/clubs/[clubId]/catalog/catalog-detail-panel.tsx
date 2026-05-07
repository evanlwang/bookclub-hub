// @spec CAT-UI-DETAIL-001, CAT-UI-SPOIL-001, CAT-UI-NOM-002
"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/components/ui";
import type { CatalogBookDetail } from "@/server/routers/catalog";

interface CatalogDetailPanelProps {
  openLibraryKey: string;
  canNominate: boolean;
  onClose: () => void;
  onNominate: (book: CatalogBookDetail) => void;
  nominating: boolean;
  nominated: boolean;
}

const SPOILER_LIMIT = 1500;
const SPOILER_KEYWORD = /spoiler/i;

export function CatalogDetailPanel({
  openLibraryKey,
  canNominate,
  onClose,
  onNominate,
  nominating,
  nominated,
}: CatalogDetailPanelProps) {
  const [detail, setDetail] = useState<CatalogBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setShowFullDescription(false);

    fetch(
      `/api/trpc/catalog.getDetail?input=${encodeURIComponent(
        JSON.stringify({ openLibraryKey })
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error.message ?? "Failed to load details");
          setDetail(null);
        } else {
          setDetail(data.result?.data ?? null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Failed to load details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [openLibraryKey]);

  // Esc closes the panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const description = detail?.description ?? null;
  const needsTruncation =
    description !== null &&
    (description.length > SPOILER_LIMIT || SPOILER_KEYWORD.test(description));
  const visibleDescription =
    needsTruncation && !showFullDescription
      ? description!.split(/\n\n+/)[0]
      : description;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="fixed inset-0 z-40 bg-bg/40 backdrop-blur-sm"
      />

      {/* Slide-out panel: full-screen on mobile, 420px from right on md+ */}
      <aside
        data-testid="catalog-detail-panel"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px] z-50 bg-bg border-l border-line shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-line bg-bg">
          <span className="text-xs uppercase tracking-wider text-ink-3">
            Book details
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-3 hover:text-ink transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div data-testid="catalog-detail-loading" className="space-y-3">
              <div className="aspect-[2/3] w-40 rounded-sm bg-bg-sunken animate-pulse" />
              <div className="h-5 w-3/4 rounded-sm bg-bg-sunken animate-pulse" />
              <div className="h-3 w-1/2 rounded-sm bg-bg-sunken animate-pulse" />
              <div className="h-20 w-full rounded-sm bg-bg-sunken animate-pulse" />
            </div>
          )}

          {error && !loading && (
            <p data-testid="catalog-detail-error" className="text-sm text-danger">
              {error}
            </p>
          )}

          {detail && !loading && (
            <>
              <div className="aspect-[2/3] w-40 rounded-sm bg-bg-sunken overflow-hidden mb-4">
                {detail.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.coverUrl}
                    alt={`Cover for ${detail.title}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex w-full h-full items-center justify-center text-3xl text-ink-3">
                    📖
                  </span>
                )}
              </div>

              <h2 className="font-[var(--font-display)] text-xl font-semibold text-ink leading-tight">
                {detail.title}
              </h2>
              <p className="text-sm text-ink-2 italic mt-1">
                {detail.authorNames.length > 0
                  ? detail.authorNames.join(" · ")
                  : "Unknown author"}
              </p>

              <div className="flex flex-wrap gap-2 mt-3 text-xs text-ink-3">
                {detail.firstPublishYear !== null && (
                  <span>First published {detail.firstPublishYear}</span>
                )}
                {detail.pageCount !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{detail.pageCount} pages</span>
                  </>
                )}
              </div>

              {visibleDescription && (
                <div className="mt-4">
                  <p className="text-sm text-ink-2 whitespace-pre-line leading-relaxed">
                    {visibleDescription}
                  </p>
                  {needsTruncation && !showFullDescription && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(true)}
                      data-testid="catalog-detail-show-full"
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Show full description
                    </button>
                  )}
                </div>
              )}

              {detail.subjects.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detail.subjects.map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-line">
                {canNominate ? (
                  <Button
                    variant={nominated ? "secondary" : "primary"}
                    size="md"
                    className="w-full"
                    loading={nominating}
                    disabled={nominated}
                    onClick={() => onNominate(detail)}
                    data-testid="catalog-detail-nominate"
                  >
                    {nominated ? "✓ Nominated for current round" : "Nominate this book"}
                  </Button>
                ) : (
                  <p className="text-xs text-ink-3 text-center">
                    Nominations open when your club starts a new round.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
