import { Card } from "@/components/ui";

export default function ProgressLoading() {
  return (
    <div className="max-w-3xl" data-testid="progress-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading progress…</span>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="h-7 w-44 rounded bg-bg-sunken animate-pulse" />
        <div className="h-9 w-44 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse" />
      </div>
      <Card className="p-5 mb-6">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-24 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 w-2/3 rounded bg-bg-sunken animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-bg-sunken animate-pulse" />
          </div>
        </div>
      </Card>
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="w-[100px] h-[100px] rounded-full bg-bg-sunken animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-3/4 rounded bg-bg-sunken animate-pulse" />
            <div className="h-3 w-full rounded-full bg-bg-sunken animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-bg-sunken animate-pulse" />
          </div>
        </div>
      </Card>
      <Card className="divide-y divide-line">
        <ul>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-bg-sunken animate-pulse shrink-0" />
              <div className="w-40 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-bg-sunken animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-bg-sunken animate-pulse" />
              </div>
              <div className="flex-1 h-2 rounded-full bg-bg-sunken animate-pulse" />
              <div className="w-10 h-4 rounded bg-bg-sunken animate-pulse" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
