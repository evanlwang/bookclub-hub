// @spec CAT-UI-LOADING-001
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="catalog-skeleton-grid"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-md)] border border-line p-3">
          <div className="aspect-[2/3] w-full rounded-sm bg-bg-sunken animate-pulse" />
          <div className="h-3 mt-3 w-3/4 rounded-sm bg-bg-sunken animate-pulse" />
          <div className="h-3 mt-2 w-1/2 rounded-sm bg-bg-sunken animate-pulse" />
        </div>
      ))}
    </div>
  );
}
