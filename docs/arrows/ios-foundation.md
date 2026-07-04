# Arrow: ios-foundation

Foundation of the native SwiftUI iPhone client — the tRPC-over-HTTP wire client (`IOSNET-` specs) and the app shell: tab navigation, session routing, and the polling engine (`IOSAPP-` specs). Everything under `ios/` that the per-domain iOS segments build on.

## Status

**PLANNED** — segment created 2026-07-03 with the arrow groundwork for the iOS client (see `docs/plans/2026-07-03-ios-swiftui-client.md`, Milestone 1). No LLD, specs, tests, or code yet.

## References

### HLD
- `docs/high-level-design.md` (iOS client in v1 scope; Architecture Overview; Tech Stack; Key Design Decisions rows on transport, session handling, project generation; wire-format-drift risk)

### LLD
- `docs/llds/ios-foundation.md` _(forthcoming — M1)_

### EARS
- `docs/specs/ios-foundation-specs.md` _(forthcoming — M1; prefixes `IOSNET-`, `IOSAPP-`)_

### Tests
- `ios/DogearKit/Tests/DogearKitTests/` _(forthcoming — Swift Testing; wire fixtures, URL construction, error mapping, date parsing)_

### Code
- `ios/DogearKit/Sources/DogearKit/{TRPC,API,Models}/` and `ios/Dogear/{App,Support}/` _(forthcoming)_

## Architecture

**Purpose:** speak the server's exact tRPC HTTP contract with zero server changes. Verified wire facts this segment pins as specs: no transformer (plain JSON, ISO-8601 date strings), non-batched `GET …?input=` for queries and `POST` JSON body for mutations, `{"result":{"data":…}}` / `error.data.code` envelopes, HttpOnly `session_id` cookie with sliding 30-day expiry handled by `HTTPCookieStorage`. Polling mirrors the `LIVE-HOOK-*` contract (pause hidden, pause while mutating, gentle in-place refresh) — hence the `blockedBy: live-updates` edge.

## Work Required

M1 of the build plan: LLD → EARS → edge audit → tests-first → `TRPCClient` actor, typed procedure catalog, error mapping, `LivePoller`, `RootView` shell, XcodeGen project.
