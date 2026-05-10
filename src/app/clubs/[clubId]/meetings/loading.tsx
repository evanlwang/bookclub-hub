import { Card } from "@/components/ui";

export default function MeetingsLoading() {
  return (
    <div data-testid="meetings-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading meetings…</span>
      <div className="h-4 w-24 rounded bg-bg-sunken animate-pulse mb-4" />
      <div className="w-full max-w-[1600px]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="h-7 w-32 rounded bg-bg-sunken animate-pulse" />
          <div className="h-9 w-36 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse" />
        </div>
        <div className="h-8 w-72 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse mb-6" />
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Card className="p-5">
                <div className="grid grid-cols-[auto_1fr_auto] gap-5 items-center">
                  <div className="w-16 h-16 rounded-[10px] bg-bg-sunken animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-bg-sunken animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-bg-sunken animate-pulse" />
                    <div className="h-3 w-2/5 rounded bg-bg-sunken animate-pulse" />
                  </div>
                  <div className="h-8 w-20 rounded-[var(--radius-md)] bg-bg-sunken animate-pulse" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
