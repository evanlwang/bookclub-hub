// @vitest-environment jsdom
//
// Verifies the global tRPC error handler installed in TRPCProvider:
// - UNAUTHORIZED query/mutation errors push the user to /login?next=<path>
// - non-UNAUTHORIZED errors do NOT redirect
// - the handler refuses to redirect when already on /login (no infinite loop)
//
// We don't spin up a real tRPC client here. The handler reads
// error.data.code === "UNAUTHORIZED" off the cache event, so the cheapest
// faithful test is to grab the configured QueryClient out of context and fire
// the caches manually.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const pushMock = vi.fn();
const pathnameMock = vi.fn<() => string>(() => "/clubs/abc/vote");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => pathnameMock(),
}));

// The provider also constructs a tRPC client; we just need the QueryClient
// configuration to be exercised, so stub the trpc proxy to a minimal shape.
vi.mock("@/trpc/react-hooks", () => ({
  trpc: {
    createClient: () => ({}),
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

import { TRPCProvider } from "@/trpc/react";

function Capture({ onReady }: { onReady: (qc: ReturnType<typeof useQueryClient>) => void }) {
  const qc = useQueryClient();
  useEffect(() => {
    onReady(qc);
  }, [qc, onReady]);
  return null;
}

function mountAndGetClient(): ReturnType<typeof useQueryClient> {
  let client: ReturnType<typeof useQueryClient> | undefined;
  render(
    <TRPCProvider>
      <Capture onReady={(qc) => (client = qc)} />
    </TRPCProvider>,
  );
  if (!client) throw new Error("QueryClient was not captured");
  return client;
}

describe("TRPCProvider — global UNAUTHORIZED handler", () => {
  beforeEach(() => {
    pushMock.mockReset();
    pathnameMock.mockReset();
    pathnameMock.mockReturnValue("/clubs/abc/vote");
    window.history.replaceState({}, "", "/clubs/abc/vote?tab=now");
  });

  it("redirects to /login?next=<encoded path+search> on a UNAUTHORIZED query error", () => {
    const qc = mountAndGetClient();
    const err = { data: { code: "UNAUTHORIZED" } };

    qc.getQueryCache().config.onError?.(
      err as unknown as Error,
      // The other args (query, etc.) are unused by our handler.
      {} as never,
    );

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/clubs/abc/vote?tab=now")}`,
    );
  });

  it("redirects on a UNAUTHORIZED mutation error too", () => {
    const qc = mountAndGetClient();
    const err = { data: { code: "UNAUTHORIZED" } };

    qc.getMutationCache().config.onError?.(
      err as unknown as Error,
      undefined as never,
      undefined as never,
      {} as never,
    );

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock.mock.calls[0][0]).toMatch(/^\/login\?next=/);
  });

  it("does NOT redirect on non-UNAUTHORIZED errors", () => {
    const qc = mountAndGetClient();
    const cases = [
      { data: { code: "INTERNAL_SERVER_ERROR" } },
      { data: { code: "BAD_REQUEST" } },
      new Error("network down"),
      { message: "no data field" },
      null,
      undefined,
    ];

    for (const err of cases) {
      qc.getQueryCache().config.onError?.(err as unknown as Error, {} as never);
    }

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does NOT redirect when already on /login (loop guard)", () => {
    pathnameMock.mockReturnValue("/login");
    window.history.replaceState({}, "", "/login?next=%2Fclubs%2Fabc");
    const qc = mountAndGetClient();

    qc.getQueryCache().config.onError?.(
      { data: { code: "UNAUTHORIZED" } } as unknown as Error,
      {} as never,
    );

    expect(pushMock).not.toHaveBeenCalled();
  });
});
