import { Card } from "@/components/ui";

export default function VoteLoading() {
  return (
    <div className="max-w-4xl" data-testid="vote-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading voting…</span>
      <div className="h-4 w-24 rounded bg-bg-sunken animate-pulse mb-4" />
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="h-7 w-40 rounded bg-bg-sunken animate-pulse" />
      </div>
      <Card className="p-5 mb-6">
        <div className="h-5 w-20 rounded-full bg-bg-sunken animate-pulse mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[22px_auto_1fr] gap-3 p-3 border border-line rounded-[var(--radius-md)]">
                <div className="w-5 h-5 rounded-full bg-bg-sunken animate-pulse" />
                <div className="w-12 h-16 rounded bg-bg-sunken animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-bg-sunken animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-bg-sunken animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
