"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

// Route-segment error boundary for /clubs/[clubId]/progress.
export default function ProgressError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[clubs/[clubId]/progress] route error:", error);
  }, [error]);

  return (
    <div className="w-full max-w-[640px] mx-auto py-12">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-2 mb-6">
          We couldn&rsquo;t load the reading progress. Try again in a moment.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
