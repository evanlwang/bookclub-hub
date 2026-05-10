import { Card } from "@/components/ui";

export default function DiscussionsLoading() {
  return (
    <div className="w-full max-w-[1600px]" data-testid="discussions-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading discussions…</span>
      <div className="h-4 w-24 rounded bg-bg-sunken animate-pulse mb-4" />
      <div className="h-9 w-32 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse mb-6" />
      <div className="h-12 w-full rounded-[var(--radius-md)] bg-bg-sunken animate-pulse mb-6" />
      <ul className="space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-4 w-16 rounded-full bg-bg-sunken animate-pulse" />
                <div className="h-3 w-12 rounded-full bg-bg-sunken animate-pulse ml-auto" />
              </div>
              <div className="h-3 w-full rounded bg-bg-sunken animate-pulse mb-1.5" />
              <div className="h-3 w-3/5 rounded bg-bg-sunken animate-pulse" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
