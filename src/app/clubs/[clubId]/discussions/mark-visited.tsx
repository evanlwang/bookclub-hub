"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/react-hooks";

// @spec CLUB-NAV-UNREAD-001, DASH-UI-NAV-UNREAD-001
// On mount, marks the viewer's "last visited discussions" timestamp for this
// club so the unread badge counts threads created after this moment as unread.
// `router.refresh()` re-runs the layout's RSC fetch so the badge updates in place.
export function MarkDiscussionsVisited({ clubId }: { clubId: string }) {
  const router = useRouter();
  const mark = trpc.clubs.markDiscussionsVisited.useMutation({
    onSuccess: () => {
      router.refresh();
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
