"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// @spec CLUB-NAV-UNREAD-001, DASH-UI-NAV-UNREAD-001
// On mount, marks the viewer's "last visited discussions" timestamp for this
// club so the unread badge counts threads created after this moment as unread.
// `router.refresh()` re-runs the layout's RSC fetch so the badge updates in place.
export function MarkDiscussionsVisited({ clubId }: { clubId: string }) {
  const router = useRouter();
  useEffect(() => {
    let aborted = false;
    fetch("/api/trpc/clubs.markDiscussionsVisited", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    })
      .then(() => {
        if (!aborted) router.refresh();
      })
      .catch(() => {
        // Best-effort — never block the user on a failed visit-mark.
      });
    return () => {
      aborted = true;
    };
  }, [clubId, router]);
  return null;
}
