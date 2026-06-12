// @vitest-environment jsdom
// @spec LIVE-HOOK-001, LIVE-HOOK-PAUSE-HIDDEN-001, LIVE-HOOK-PAUSE-MUTATING-001, LIVE-HOOK-STALETIME-001, LIVE-HOOK-ENABLED-001

import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useLiveQueryOptions } from "@/lib/hooks/use-live-query";

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

afterEach(() => cleanup());

describe("useLiveQueryOptions", () => {
  // @spec LIVE-HOOK-STALETIME-001
  it("sets staleTime equal to intervalMs so focus refetches don't stack on polls", () => {
    const { result } = renderHook(
      () => useLiveQueryOptions({ intervalMs: 15_000 }),
      { wrapper: makeWrapper(newClient()) },
    );
    expect(result.current.staleTime).toBe(15_000);
  });

  // @spec LIVE-HOOK-001
  it("returns the interval from the refetchInterval function when idle", () => {
    const { result } = renderHook(
      () => useLiveQueryOptions({ intervalMs: 10_000 }),
      { wrapper: makeWrapper(newClient()) },
    );
    expect(typeof result.current.refetchInterval).toBe("function");
    expect(result.current.refetchInterval()).toBe(10_000);
  });

  // @spec LIVE-HOOK-PAUSE-HIDDEN-001
  it("does not override refetchIntervalInBackground (pins the pause-when-hidden default)", () => {
    const { result } = renderHook(
      () => useLiveQueryOptions({ intervalMs: 10_000 }),
      { wrapper: makeWrapper(newClient()) },
    );
    expect(
      "refetchIntervalInBackground" in result.current
        ? (result.current as Record<string, unknown>).refetchIntervalInBackground
        : undefined,
    ).toBeFalsy();
  });

  // @spec LIVE-HOOK-ENABLED-001
  it("returns false from refetchInterval when enabled is false", () => {
    const { result } = renderHook(
      () => useLiveQueryOptions({ intervalMs: 10_000, enabled: false }),
      { wrapper: makeWrapper(newClient()) },
    );
    expect(result.current.refetchInterval()).toBe(false);
  });

  // @spec LIVE-HOOK-PAUSE-MUTATING-001
  it("suspends the interval while a mutation is in flight and resumes after it settles", async () => {
    const queryClient = newClient();
    let resolveMutation!: () => void;
    const gate = new Promise<void>((r) => (resolveMutation = r));

    const { result } = renderHook(
      () => {
        const live = useLiveQueryOptions({ intervalMs: 10_000 });
        const mutation = useMutation({ mutationFn: () => gate });
        return { live, mutation };
      },
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.live.refetchInterval()).toBe(10_000);

    result.current.mutation.mutate();
    await waitFor(() => {
      expect(result.current.live.refetchInterval()).toBe(false);
    });

    resolveMutation();
    await waitFor(() => {
      expect(result.current.live.refetchInterval()).toBe(10_000);
    });
  });

  // @spec LIVE-HOOK-PAUSE-MUTATING-001
  it("keeps polling during mutations when pauseWhenMutating is false", async () => {
    const queryClient = newClient();
    let resolveMutation!: () => void;
    const gate = new Promise<void>((r) => (resolveMutation = r));

    const { result } = renderHook(
      () => {
        const live = useLiveQueryOptions({
          intervalMs: 10_000,
          pauseWhenMutating: false,
        });
        const mutation = useMutation({ mutationFn: () => gate });
        return { live, mutation };
      },
      { wrapper: makeWrapper(queryClient) },
    );

    result.current.mutation.mutate();
    await waitFor(() => {
      expect(result.current.mutation.isPending).toBe(true);
    });
    expect(result.current.live.refetchInterval()).toBe(10_000);
    resolveMutation();
  });

  // @spec LIVE-HOOK-001 — end-to-end: a query spread with the options actually polls.
  it("polls a live query at the configured interval", async () => {
    const queryClient = newClient();
    let fetches = 0;

    const { result } = renderHook(
      () => {
        const live = useLiveQueryOptions({ intervalMs: 50 });
        return useQuery({
          queryKey: ["poll-me"],
          queryFn: async () => {
            fetches += 1;
            return fetches;
          },
          ...live,
        });
      },
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    await waitFor(
      () => {
        expect(fetches).toBeGreaterThanOrEqual(3);
      },
      { timeout: 2_000 },
    );
  });
});
