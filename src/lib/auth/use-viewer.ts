"use client";

import { trpc } from "@/trpc/react-hooks";

/**
 * Single source of truth for the viewer's identity + role in the current club.
 *
 * Backed by `trpc.auth.me.useQuery` with a 60s stale window so multiple pages
 * mounting at once share one server round-trip. Pass a `clubId` to also pull
 * the viewer's role for that club (used by edit/delete/admin gating across
 * discussions, settings, vote-round, etc.).
 *
 * Replaces the per-component `fetch("/api/trpc/auth.me")` patterns scattered
 * across the discussion detail page, settings page, members page, etc.
 */
export function useViewer(clubId?: string) {
  const me = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
  });

  const membership = clubId
    ? me.data?.clubs.find((c) => c.id === clubId)
    : undefined;

  const role = membership?.role ?? null;
  const isAdmin = role === "admin" || role === "owner";
  const isOwner = role === "owner";

  return {
    viewerId: me.data?.user.id ?? null,
    viewerName: me.data?.user.displayName ?? "",
    viewerEmail: me.data?.user.email ?? "",
    role,
    isAdmin,
    isOwner,
    /** All clubs the viewer is a member of. */
    clubs: me.data?.clubs ?? [],
    isLoading: me.isPending,
    isLoaded: me.isSuccess,
  };
}
