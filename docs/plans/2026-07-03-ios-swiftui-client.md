# Dogear iOS: Native SwiftUI Client via LID

## Context

Dogear v1 shipped as a passcode-gated web pilot (Next.js + tRPC + Neon, on Vercel). The HLD explicitly deferred native apps. This plan reverses that deferral: build a native SwiftUI iPhone client with **full feature parity** (auth, clubs, voting, meetings, discussions, progress), developed under the repo's Full-mode Linked-Intent Development discipline — the iOS work becomes new arrow segments in the existing `docs/` intent chain, not a side project.

**Decisions locked in with the user:**
- Native client of the **existing** tRPC backend — no server changes.
- Lives in this repo under `ios/`, integrated into the existing LID arrow.
- Thin hand-rolled URLSession tRPC client + Codable models (no OpenAPI layer).
- **Fully native HIG look** — system fonts, SF Symbols, standard controls. No port of the web design tokens; `DSYS-`/`COMP-*` segments do not block iOS.
- iPhone only, iOS 18+, Swift 6 / SwiftUI / Observation framework, Swift Testing. Zero third-party dependencies.

**Verified wire facts** (the whole client design rests on these):
- No transformer: `src/server/trpc.ts:13` is `initTRPC.context<Context>().create()` bare; client uses bare `httpBatchLink` (`src/trpc/react.tsx:64`). Plain JSON on the wire; Prisma dates are ISO-8601 strings.
- `src/app/api/trpc/[trpc]/route.ts` exports GET+POST via `fetchRequestHandler`; non-batched calls work: query = `GET /api/trpc/{router.proc}?input=<url-encoded JSON>`, mutation = `POST` with JSON body. Success envelope `{"result":{"data":…}}`; errors carry `error.data.code` (e.g. `"UNAUTHORIZED"`) + matching HTTP status.
- Session = HttpOnly `session_id` cookie, 30-day sliding TTL re-issued on every authed call (`route.ts:24-33`), `Secure` only in prod. `URLSession` + `HTTPCookieStorage.shared` handles it for free.
- `memberProcedure`/`adminProcedure` require `clubId` (UUID) in every input. Auth entry (`auth.signIn`/`enter`, `clubs.join`) is passcode-gated and rate-limited 5/min per IP+email.
- Liveness is polling, not sockets — mirror the `LIVE-HOOK-*` contract (pause hidden, pause while mutating, gentle in-place refresh).

## Milestone 0 — Arrow groundwork (LID Phase 1 + overlay)

1. Copy this plan to `docs/plans/2026-07-03-ios-swiftui-client.md` (per plan-storage preference) on a new branch `feature/ios-arrow-groundwork`.
2. **HLD amendment** (`docs/high-level-design.md`): v1 Scope (~line 76) gains the native iPhone client; Non-Goals (~line 97) drops "Mobile-native apps", keeps Android/iPad/push as non-goals; Architecture Overview adds the iOS client as a second consumer of `/api/trpc`; Tech Stack adds Swift 6/SwiftUI/XcodeGen/Swift Testing; Key Design Decisions table adds: native SwiftUI (vs RN/wrapper), hand-rolled tRPC client (vs OpenAPI codegen), HIG-native look (vs token port), cookie reuse via HTTPCookieStorage, XcodeGen (vs checked-in pbxproj/Tuist). **STOP for user review.**
3. **Arrow overlay** (`docs/arrows/index.yaml` + detail stubs `docs/arrows/ios-*.md`): new taxonomy group `ios-client` with 7 segments; symmetric `blocks`/`blockedBy` edges added to existing segments. `mobile-specs.md` stays unmapped (it's the web PWA layer).

| Segment | Prefixes | blockedBy |
|---|---|---|
| ios-foundation | `IOSNET-`, `IOSAPP-` | auth, live-updates, infra |
| ios-auth | `IOSAUTH-` | ios-foundation, auth |
| ios-clubs | `IOSCLUB-` | ios-foundation, ios-auth, clubs |
| ios-voting | `IOSVOTE-` | ios-clubs, voting |
| ios-meetings | `IOSMEET-` | ios-clubs, meetings |
| ios-discussions | `IOSDISC-` | ios-clubs, discussions |
| ios-progress | `IOSPROG-` | ios-clubs, reading-progress |

New segments (not layers inside existing ones) so Swift view churn never cascade-pauses into web UI specs; the API-contract dependency is expressed as `blockedBy` edges instead. Multi-prefix segments are precedented (clubs owns CLUB-/DASH-/JOIN-/HOME-).

4. **CLAUDE.md**: add `ios/` to Directory Structure, extend the grep recipe to `grep -rn "ID" src/ tests/ ios/`, add iOS build/test commands. **STOP for user review.** Commit + PR.

## Milestones 1–7 — one arrow segment each, walking LID Phases 2–6

Each milestone: draft LLD (`docs/llds/ios-<domain>.md`, house template) → **stop** → EARS specs (`docs/specs/ios-<domain>-specs.md`, house row format, `[ ]` markers) + consistency report → **stop** → intent-narrowing edge audit → **stop** → Swift Testing tests with `// @spec` annotations, failing → **stop** → implement, flip markers to `[x]`, stamp segment in `index.yaml`, coherence verification → **stop**. Each on its own `feature/ios-<domain>` branch + PR.

- **M1 ios-foundation**: `TRPCClient` actor + typed procedure catalog + error mapping + `LivePoller` + `RootView` shell + XcodeGen project. Representative specs: `IOSNET-URL-001/002` (query/mutation wire shape), `IOSNET-DECODE-DATE-001` (ISO-8601 ± millis), `IOSNET-ERR-*` (one per mapped `error.data.code`), `IOSNET-COOKIE-001` (persistence + 401 → sign-out routing), `IOSAPP-POLL-001..004` (mirror LIVE-HOOK rows), `IOSAPP-NAV-001`, `IOSAPP-SESSION-001`.
- **M2 ios-auth**: entry flow (email + display name + passcode; sign-in vs join/create branch), `SessionStore.bootstrap()` via `auth.me`, logout (call `auth.logout`, wipe cookies).
- **M3 ios-clubs**: dashboard, club switcher (toolbar Menu; active club id in UserDefaults), join/create/lookup, members + role management, navState/unread badges.
- **M4 ios-voting**: rounds list/detail, nominations (debounced + cancellable `books.search`, `createManual`), ballot with maxApprovals (optimistic toggle), turnout, admin close-preview/advance/cancel, selections.
- **M5 ios-meetings**: list/detail, admin create/update/confirm/cancel, 3-state availability grid (optimistic taps).
- **M6 ios-progress** (before discussions — smallest surface): update sheet, club dashboard via `progress.list/me/update/summary`.
- **M7 ios-discussions**: thread list with chapter chips + spoiler filter, thread detail, comments CRUD. Open question to resolve in its LLD phase: is spoiler filtering fully server-side in `threads.list`, or must `DogearKit/Domain` mirror `src/lib/discussions/spoiler-cutoff.ts`?

## Project structure (created in M1)

```
ios/
├── project.yml                  # XcodeGen manifest (app target, iOS 18, links DogearKit)
├── .gitignore                   # Dogear.xcodeproj, DerivedData
├── DogearKit/                   # Local SPM package, Foundation-only (also builds on macOS → fast `swift test`)
│   ├── Sources/DogearKit/{TRPC,API,Models,Domain}/
│   └── Tests/DogearKitTests/    # Swift Testing + Fixtures/*.json
└── Dogear/                      # App target (SwiftUI only)
    ├── App/                     # DogearApp, RootView, AppEnvironment (base URL config)
    ├── Support/                 # LivePoller, ErrorBanner, formatters
    └── Features/{Auth,Clubs,Voting,Meetings,Discussions,Progress}/
```

XcodeGen over checked-in `.xcodeproj` (no pbxproj churn; regenerates in <1s) and over Tuist (too heavy for one target). Single app target + one SPM package — no feature modules at this scale. Debug builds get an ATS local-networking exception for `http://localhost:3000`.

**Key design points:**
- `TRPCClient` actor: `call<P: TRPCProcedure>(_:input:) async throws -> P.Output`; `requestCachePolicy = .reloadIgnoringLocalCacheData` so URLCache never serves stale tRPC GETs; JSONDecoder date strategy tries ISO-8601 with then without fractional seconds.
- Typed catalog `API.Auth/.Clubs/.Rounds/…` — one static `Query<In,Out>`/`Mutation<In,Out>` per procedure; Input structs restate the Zod shapes (always incl. `clubId` for club-scoped calls); Output structs decoded from checked-in fixtures captured via `curl` against the seeded dev server.
- Errors: switch on `error.data.code` → `DogearAPIError` enum; a client-level hook routes `.unauthorized` to `SessionStore` (native analog of the web's QueryCache `onAuthError`).
- State: `@Observable` stores — `SessionStore` in `.environment`, per-domain stores holding `LoadState<T>` + mutation methods. Navigation: `RootView` switches session state → `EntryFlowView` vs `ClubTabView` (tabs: Dashboard, Vote, Meetings, Discussions, Progress; each with its own NavigationStack).
- Offline cache/queue is an explicit non-goal in v1 (stated in ios-foundation LLD); errors → retry banner.

## Testing strategy

- **Unit** (`DogearKitTests`, `swift test`, no simulator): fixture decoding per Output model, URL construction, error mapping, date parsing, mirrored domain logic parity cases.
- **Integration** (`DogearKitIntegrationTests`, skipped unless `DOGEAR_BASE_URL` set): against `make dev` + seed — sign in **once per suite** (5/min rate limit) as alice@example.com, then one round-trip per domain. One test asserts the raw envelope shape to catch any future transformer addition.
- **XCUITest**: deferred except one launch smoke test; record deferrals as `[D]` rows.
- `// @spec IOSNET-…` comments work with the existing grep chain once `ios/` joins the recipe.

## Risks

1. Server adds superjson later → integration envelope-shape test fails loudly (by design).
2. Physical-device dev needs the Mac's LAN IP (non-Secure cookie is fine over local http; prod requires https).
3. Passcode typed in-app, never persisted — the cookie is the durable credential; entry screen needs a `TOO_MANY_REQUESTS` UX.
4. Web-only affordances (login `?next=`, clipboard invite-copy) get native equivalents, specced per segment.

## Verification (per milestone and at the end)

- LID coherence: every `[x]` iOS spec ID appears in ≥1 test and ≥1 source file under `ios/`; `index.yaml` edges symmetric; semantic spec↔LLD↔HLD report per segment.
- Runtime: `make dev` → `cd ios && xcodegen generate` → run on iOS 18 simulator → sign in as alice@example.com + pilot passcode → WEDREADS dashboard, cast a vote, mark availability, update progress, post a comment → relaunch app to verify cookie persistence.
- Tests: `cd ios/DogearKit && swift test`; `DOGEAR_BASE_URL=http://localhost:3000 xcodebuild test -scheme Dogear -destination 'platform=iOS Simulator,name=iPhone 16'`.
- Web suite untouched: `npm run test && npm run lint && npm run typecheck` (zero `src/` changes expected).
