"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/trpc/react-hooks";

// @spec CLUB-NAV-UNREAD-001, DASH-UI-NAV-UNREAD-001, CLUB-NAV-BADGE-LIVE-001
// On mount, marks the viewer's "last visited discussions" timestamp for this
// club so the unread badge counts threads created after this moment as unread.
// Invalidating `clubs.navState` refetches the badge query in place — no
// full-layout router.refresh() for a counter update.
export function MarkDiscussionsVisited({ clubId }: { clubId: string }) {
  const utils = trpc.useUtils();
  const mark = trpc.clubs.markDiscussionsVisited.useMutation({
    onSuccess: () => {
      void utils.clubs.navState.invalidate();
    },
    // Best-effort — never block the user on a failed visit-mark; swallow errors.
    onError: () => {},
  });

  // Fire once on mount (and again only if clubId changes). React StrictMode
  // double-invokes effects in dev — `firedRef` keeps the mutation from racing.
  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (firedRef.current === clubId) return;
    firedRef.current = clubId;
    mark.mutate({ clubId });
  }, [clubId, mark]);

  return null;
}
