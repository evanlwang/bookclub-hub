// @spec LIVE-HOOK-001, LIVE-HOOK-PAUSE-HIDDEN-001, LIVE-HOOK-PAUSE-MUTATING-001, LIVE-HOOK-STALETIME-001, LIVE-HOOK-ENABLED-001
"use client";

import { useIsMutating } from "@tanstack/react-query";

export type LiveQueryOptions = {
  /** Polling cadence. Per the live-updates LLD interval table — never below 10s in app code. */
  intervalMs: number;
  /** Gate polling on a condition (e.g. round is active). Default true. */
  enabled?: boolean;
  /**
   * Suspend the interval while any mutation is in flight so a poll dispatched
   * mid-mutation can't overwrite optimistic cache state. Default true.
   */
  pauseWhenMutating?: boolean;
};

/**
 * Shared polling contract for live surfaces (docs/llds/live-updates.md).
 * Spread the result into a tRPC `useQuery` options object:
 *
 *   trpc.rounds.turnout.useQuery(input, {
 *     initialData,
 *     ...useLiveQueryOptions({ intervalMs: 15_000 }),
 *   });
 *
 * Polling is opt-in per call site — there is no global refetchInterval.
 * `refetchIntervalInBackground` is intentionally not set: the React Query
 * default (false) pauses polling while the tab is hidden.
 */
// Test-only knob: NEXT_PUBLIC_LIVE_INTERVAL_SCALE shrinks every poll interval
// (e.g. 0.15 in the e2e web server) so two-context live tests don't wait out
// production cadences. Defaults to 1 — production intervals are the spec'd
// values in docs/llds/live-updates.md.
const INTERVAL_SCALE = Number(
  process.env.NEXT_PUBLIC_LIVE_INTERVAL_SCALE || "1"
);

export function useLiveQueryOptions({
  intervalMs: baseIntervalMs,
  enabled = true,
  pauseWhenMutating = true,
}: LiveQueryOptions) {
  const mutating = useIsMutating();
  const intervalMs =
    INTERVAL_SCALE > 0 && Number.isFinite(INTERVAL_SCALE)
      ? Math.max(250, Math.round(baseIntervalMs * INTERVAL_SCALE))
      : baseIntervalMs;
  return {
    refetchInterval: () => {
      if (!enabled) return false;
      if (pauseWhenMutating && mutating > 0) return false;
      return intervalMs;
    },
    // Interval refetches ignore staleTime, but focus refetches respect it —
    // matching them keeps a window focus from stacking an extra fetch on top
    // of the poll while leaving the app-wide 30s default for non-live queries.
    staleTime: intervalMs,
  } as const;
}
