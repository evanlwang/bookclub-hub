"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

// Route-segment error boundary for the club shell. Catches errors thrown by
// the layout or any child route that doesn't have its own boundary.
export default function ClubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console so it shows up in dev tools / Vercel runtime logs.
    console.error("[clubs/[clubId]] route error:", error);
  }, [error]);

  return (
    <div className="w-full max-w-[640px] mx-auto py-12">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold text-ink mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-2 mb-6">
          We ran into an unexpected problem loading this club. Try again, or
          head back to your dashboard.
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
