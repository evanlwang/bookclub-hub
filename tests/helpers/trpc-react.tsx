/**
 * Test harness for client components that call tRPC hooks.
 *
 * Builds a real `trpc` React client over `httpBatchLink` with a stubbed
 * `fetch`, so mutation handlers (`onMutate`/`onError`/`onSettled`) and the
 * React Query cache behave exactly as in production — no hook mocking.
 *
 * The `handler(path, input)` callback resolves each procedure call; throw
 * (or reject) to simulate a server error. Use `deferred()` to control
 * resolution timing and observe optimistic intermediate states.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/trpc/react-hooks";

export type TrpcHandler = (path: string, input: unknown) => unknown;

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function createTrpcTestHarness(handler: TrpcHandler) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const fetchImpl = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const url = new URL(String(input));
    const paths = decodeURIComponent(
      url.pathname.replace(/^.*\/api\/trpc\//, ""),
    ).split(",");
    let inputs: Record<string, unknown> = {};
    const rawInput = init?.body
      ? String(init.body)
      : url.searchParams.get("input");
    if (rawInput) inputs = JSON.parse(rawInput) as Record<string, unknown>;

    const results = await Promise.all(
      paths.map(async (path, i) => {
        try {
          const data = await handler(path, inputs[String(i)]);
          return { result: { data } };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return {
            error: {
              message,
              code: -32603,
              data: {
                code: "INTERNAL_SERVER_ERROR",
                httpStatus: 500,
                path,
              },
            },
          };
        }
      }),
    );
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = trpc.createClient({
    links: [
      httpBatchLink({
        url: "http://localhost/api/trpc",
        fetch: fetchImpl as typeof fetch,
      }),
    ],
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <trpc.Provider client={client} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    );
  }

  return { queryClient, Wrapper };
}
