// Typed tRPC react-query bindings. Client components import `trpc` from here
// and call e.g. `trpc.threads.list.useQuery({ clubId, bookId })` with full
// end-to-end type inference, automatic caching, and built-in loading/error
// state — replacing the project's older raw `fetch("/api/trpc/...")` pattern.
//
// The provider that mounts this lives at src/trpc/react.tsx.
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();
