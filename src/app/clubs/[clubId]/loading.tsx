import { Card } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="max-w-4xl" data-testid="dashboard-loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>
      <div className="mb-8">
        <div className="h-8 w-2/5 rounded bg-bg-sunken animate-pulse mb-2" />
        <div className="h-4 w-32 rounded bg-bg-sunken animate-pulse" />
      </div>
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="w-[120px] h-[180px] rounded-[var(--radius-md)] bg-bg-sunken animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-3 w-24 rounded bg-bg-sunken animate-pulse" />
            <div className="h-6 w-3/4 rounded bg-bg-sunken animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-bg-sunken animate-pulse" />
            <div className="h-2 w-full rounded-full bg-bg-sunken animate-pulse mt-6" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-5">
            <div className="h-3 w-20 rounded bg-bg-sunken animate-pulse mb-3" />
            <div className="h-4 w-3/5 rounded bg-bg-sunken animate-pulse mb-2" />
            <div className="h-3 w-2/5 rounded bg-bg-sunken animate-pulse" />
          </Card>
        ))}
      </div>
    </div>
  );
}
