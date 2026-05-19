"use client";

import { useMemo } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useRouter, usePathname } from "next/navigation";
import { trpc } from "./react-hooks";

/**
 * Detect tRPC's serialized UNAUTHORIZED shape: error.data.code === "UNAUTHORIZED".
 * Defensive against unknown error shapes — some libraries surface plain Errors.
 */
function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const data = (err as { data?: unknown }).data;
  if (!data || typeof data !== "object") return false;
  return (data as { code?: unknown }).code === "UNAUTHORIZED";
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Recreate the QueryClient when the auth-redirect handler's dependencies
  // change. In practice these are stable for the session, so this is a single
  // instance — but useMemo (not useState) keeps the closure pointing at the
  // current router/pathname instead of capturing stale values from first mount.
  const queryClient = useMemo(() => {
    const onAuthError = (err: unknown) => {
      if (!isUnauthorizedError(err)) return;
      // Guard against infinite redirect loops if the login page itself
      // somehow triggers an UNAUTHORIZED tRPC call.
      if (typeof window === "undefined") return;
      if (pathname === "/login" || window.location.pathname === "/login") return;
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      router.push(`/login?next=${next}`);
    };

    return new QueryClient({
      queryCache: new QueryCache({ onError: onAuthError }),
      mutationCache: new MutationCache({ onError: onAuthError }),
      defaultOptions: {
        queries: {
          // Collaborative app — refetch on focus so a user returning to the
          // tab sees fresh state. Pair with a small staleTime to avoid
          // re-fetching the same data on every quick tab switch.
          staleTime: 30_000,
          refetchOnWindowFocus: true,
        },
      },
    });
  }, [router, pathname]);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [httpBatchLink({ url: "/api/trpc" })],
      }),
    [],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
