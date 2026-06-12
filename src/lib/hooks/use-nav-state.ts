// @spec CLUB-NAV-BADGE-LIVE-001
"use client";

import { trpc } from "@/trpc/react-hooks";
import { useLiveQueryOptions } from "./use-live-query";

export type NavState = {
  hasActiveVote: boolean;
  hasUnrespondedMeeting: boolean;
  /** Cross-club map — also feeds the club-switcher dots (CLUB-NAV-UNREAD-001). */
  unreadDiscussionCounts: Record<string, number>;
};

const EMPTY_NAV_STATE: NavState = {
  hasActiveVote: false,
  hasUnrespondedMeeting: false,
  unreadDiscussionCounts: {},
};

/**
 * Nav-badge state for the current club, seeded by the layout RSC and kept
 * fresh by a 60s poll plus targeted `utils.clubs.navState.invalidate()`
 * calls after mutations that change a badge. Replaces the old pattern of
 * full-layout `router.refresh()` for counter/badge updates
 * (docs/llds/live-updates.md § router.refresh() policy).
 */
export function useNavState(clubId: string, initial?: NavState): NavState {
  const query = trpc.clubs.navState.useQuery(
    { clubId },
    {
      ...(initial !== undefined ? { initialData: initial } : {}),
      ...useLiveQueryOptions({ intervalMs: 60_000 }),
    }
  );
  return query.data ?? initial ?? EMPTY_NAV_STATE;
}
