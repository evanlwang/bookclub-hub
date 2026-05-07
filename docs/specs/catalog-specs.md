# Book Search Catalog Specs

**LLD**: [docs/llds/book-search-catalog.md](../llds/book-search-catalog.md)
**Implementing artifacts**:
- API: `src/server/routers/catalog.ts`, `src/server/services/open-library.ts`, `src/server/routers/books.ts` (importFromCatalog)
- UI: `src/app/clubs/[clubId]/catalog/page.tsx`, `catalog-client.tsx`, `catalog-result-card.tsx`, `catalog-detail-panel.tsx`, `skeleton-grid.tsx`, `sidebar.tsx` (Browse books link)
- Tests: `tests/integration/catalog.test.ts`, `tests/integration/books.test.ts` (importFromCatalog), `tests/e2e/catalog-search.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap (not yet built) · `[D]` deferred · `[!]` divergence

**Relation to voting specs.** `books.search` (VOTE-API-009) exists already and is purpose-built for the nominate-modal flow: it persists every Open Library hit into the local `Book` table so a `bookId` can be referenced by a `Nomination`. The catalog feature here is a discovery/browse surface — paginated, no auto-persist, no nomination side-effect. Catalog procedures only write to `Book` when a user explicitly imports a result (e.g. nominates from the catalog). See `CAT-BE-002` for the import handoff.

---

## Goals

A free, low-friction way for any club member to search Open Library, browse results with covers, open a detail view, and (optionally) hand the book off to the existing nomination flow. Zero external API cost; graceful degradation when Open Library is slow or down.

---

## Search API

- `[x]` **CAT-API-001**: The `catalog.search` procedure SHALL accept `{ query: string (1..200 chars), page?: number (default 1, min 1), limit?: number (default 20, min 1, max 50) }` and return `{ results: CatalogBook[], page, limit, totalEstimate, source: "open-library" | "cache" }`. Member-or-above auth (matches the existing `protectedProcedure` pattern in `books.ts`). (`catalog.ts:55-71`)
- `[x]` **CAT-API-002**: The `catalog.searchByIsbn` procedure SHALL accept `{ isbn: string }` (10 or 13 digits, hyphens stripped) and return at most one `CatalogBook` or `null`. Resolves via `https://openlibrary.org/isbn/{isbn}.json` then enriches with the parent work record for description and covers. (`catalog.ts:74-79`, `open-library.ts:217-235`)
- `[x]` **CAT-API-003**: The `catalog.getDetail` procedure SHALL accept `{ openLibraryKey: string }` (e.g. `/works/OL45804W`) and return the full `CatalogBookDetail`: title, authors[], description, firstPublishYear, subjects[], coverUrl (L size), pageCount, isbns[]. Returns `NOT_FOUND` if the key does not resolve. (`catalog.ts:82-87`, `open-library.ts:238-260`)
- `[x]` **CAT-API-004**: All catalog queries SHALL be safe to call without a `clubId` — discovery is club-agnostic. Procedures live under `protectedProcedure`, not `memberProcedure`. (`catalog.ts:55,74,82`)

## Result Shape

- `[x]` **CAT-BE-001**: `CatalogBook` SHALL be the normalized shape returned to clients: `{ openLibraryKey, title, authorNames: string[], firstPublishYear: number | null, coverUrl: string | null, isbn: string | null, pageCount: number | null }`. Differs from `OpenLibraryBook` (current service shape, single-author) by exposing `authorNames[]` and dropping the `description` field (detail-only). (`open-library.ts:23-31`)
- `[x]` **CAT-BE-002**: When a user nominates a catalog result, the calling code SHALL pass the catalog payload to `books.importFromCatalog` (new procedure on the existing books router) which performs the upsert into the `Book` table and returns the internal `bookId`. Catalog procedures themselves SHALL NOT write to `Book`. (`books.ts:101-142`)
- `[x]` **CAT-BE-003**: `coverUrl` SHALL be `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg` for list views and `-L.jpg` for the detail view. When `cover_i` is absent, `coverUrl` SHALL be `null` and the UI SHALL render a neutral placeholder (no broken image). (`open-library.ts:208-214,253` for cover sizes; `catalog-result-card.tsx:32-46` and `catalog-detail-panel.tsx:121-135` for placeholder rendering)

## Caching & Rate Limiting

- `[x]` **CAT-BE-CACHE-001**: The Open Library service SHALL maintain an in-memory LRU keyed by `(endpoint, normalizedQuery, page, limit)` with TTL ≥ 1h and capacity ≥ 200 entries. A cache hit returns immediately and sets `source: "cache"` on the response. Reasoning: Open Library is unauthenticated but expects polite usage (~100 req/min). Aggressive caching makes typeahead viable without hammering them. (`open-library.ts:54-87` LRU class; `open-library.ts:189-205` search cache wiring)
- `[x]` **CAT-BE-CACHE-002**: Query normalization SHALL trim, lowercase, and collapse internal whitespace before cache lookup so `"  Dune  "` and `"dune"` share a cache slot. (`open-library.ts:184-186`)
- `[x]` **CAT-BE-RATE-001**: The Open Library service SHALL set `Accept: application/json` and a `User-Agent: BookClubHub/0.1 (+contact)` header on every outbound call (Open Library asks identifiable UAs). (`open-library.ts:131-134`)
- `[!]` **CAT-BE-TIMEOUT-001**: Outbound fetches SHALL use a 5s timeout. On timeout the procedure SHALL throw `TRPCError({ code: "TIMEOUT" })` rather than hang. **Divergence:** implementation uses `Promise.race` with a resolving sentinel rather than `AbortSignal.timeout`, because mocked fetches in tests do not honor `AbortSignal`. Behavior matches the spec; mechanism differs. (`open-library.ts:118-156`)

## Failure Modes

- `[x]` **CAT-BE-FAIL-001**: When Open Library returns 5xx or the fetch throws, `catalog.search` SHALL throw `TRPCError({ code: "BAD_GATEWAY", message: "Catalog temporarily unavailable" })`. Differs from `books.search` (VOTE-API-009) which silently returns `[]` for graceful degradation inside the nominate modal — the catalog page wants to show an error so the user knows to retry. (`open-library.ts:138-143,160-164`)
- `[x]` **CAT-BE-FAIL-002**: `catalog.searchByIsbn` and `catalog.getDetail` SHALL return `null` / throw `NOT_FOUND` for missing records (404 from Open Library) rather than `BAD_GATEWAY`. (`open-library.ts:159` returns null for 404; `open-library.ts:240-245` maps null → `NOT_FOUND` in `getWorkDetail`)

## UI — Catalog Page

- `[x]` **CAT-UI-PAGE-001**: A new route `/clubs/[clubId]/catalog` SHALL be reachable from the club sidebar (link label "Browse books"). The page is server-rendered; the search interaction is a client component. (`catalog/page.tsx`, `sidebar.tsx:27`)
- `[x]` **CAT-UI-SEARCH-001**: The page SHALL render a search input at the top with 300ms debounce (consistent with `nominate-modal.tsx`). Empty input → empty state (no API call). On submit/debounce-fire, it calls `catalog.search`. (`catalog-client.tsx:78-86,89-97`)
- `[x]` **CAT-UI-RESULTS-001**: Results SHALL render as a responsive grid of cards: cover (square aspect, placeholder if null), title (line-clamp-2), authors joined by " · ", first publish year, "Details" link, "Nominate" button (disabled when no active "nominating" round; tooltip explains why). (`catalog-result-card.tsx`)
- `[x]` **CAT-UI-PAGER-001**: A pager at the bottom shows `Page {n}` with prev/next buttons. Prev disabled on page 1; next disabled when `results.length < limit`. No total-count display (Open Library's count is unreliable for noisy queries). (`catalog-client.tsx:264-289`)
- `[x]` **CAT-UI-DETAIL-001**: Clicking "Details" SHALL open a side panel (or modal on mobile) showing large cover, full title, authors, description, first publish year, page count, ISBN(s), subjects (chips, max 8). Lazy-loads via `catalog.getDetail`. Includes "Nominate" CTA with the same active-round gating as the card. (`catalog-detail-panel.tsx`)
- `[x]` **CAT-UI-EMPTY-001**: Zero-result query SHALL show the message "No books matched '{query}'." with a hint linking to the manual-entry flow already in the nominate modal. (`catalog-client.tsx:246-262`)
- `[x]` **CAT-UI-ERROR-001**: A `BAD_GATEWAY` from `catalog.search` SHALL render an inline retry banner: "Catalog is unavailable right now. Try again." with a Retry button. Per CAT-BE-FAIL-001. (`catalog-client.tsx:212-228`)
- `[x]` **CAT-UI-LOADING-001**: While a search is in flight, the results grid SHALL show 6 skeleton cards. Subsequent searches keep prior results visible until the new ones arrive (no flash to empty). (`skeleton-grid.tsx`; `catalog-client.tsx:117-119` keeps prior results)

## UI — ISBN Search

- `[x]` **CAT-UI-ISBN-001**: When the search input value (after stripping hyphens and whitespace) matches `/^(\d{10}|\d{13})$/`, the client SHALL call `catalog.searchByIsbn` instead of `catalog.search`. ISBN-mode kicks in on the same 300ms debounce as keyword mode. (`catalog-client.tsx:35-39` detection; `catalog-client.tsx:103-127` branch)
- `[x]` **CAT-UI-ISBN-002**: An ISBN lookup SHALL render a single result card on hit, or the empty-state card on miss ("No book found for ISBN {isbn}."). The pager SHALL be hidden in ISBN mode (a single result has no next page). (`catalog-client.tsx:368-376` empty-state copy; `catalog-client.tsx:391-419` pager `!isbn` gate)
- `[x]` **CAT-UI-ISBN-003**: When the input is in ISBN mode, the search bar SHALL show a subtle "ISBN" pill next to the input as visual confirmation. The pill clears as soon as the input no longer parses as an ISBN. (`catalog-client.tsx:268-276`)

## UI — Nominate-from-Catalog Handoff

- `[!]` **CAT-UI-NOM-001**: Clicking "Nominate" on any catalog card or detail panel SHALL call `books.importFromCatalog` (CAT-BE-002), then `nominations.create` with the returned `bookId`. On success, a confirmation appears with a link to `/clubs/[clubId]/vote`. **Divergence:** confirmation is an inline banner under the search input rather than a toast — matches the inline-message style used by `vote-round.tsx` and avoids adding a toast library for one message. (`catalog-client.tsx:140-185,195-211`)
- `[x]` **CAT-UI-NOM-002**: The Nominate button SHALL be visible only when an active round exists and is in "nominating" phase for this club. Otherwise it is hidden and a small inline note explains "Nominations open when your club starts a new round." (`catalog/page.tsx:18-26` server-side gating; `catalog-result-card.tsx:81-90` per-card hide; `catalog-client.tsx:188-194` page-level note)

## Spoiler Safety

- `[x]` **CAT-UI-SPOIL-001**: The detail panel SHALL NOT render plot synopses that read as spoiler-laden. Open Library's `description` field is generally safe (jacket-copy style), but if it ever exceeds 1500 chars or contains the substring "spoiler" (case-insensitive), the UI SHALL truncate to first paragraph with a "Show full description" reveal. Cheap, defensive, no NLP. (`catalog-detail-panel.tsx:18-19,79-86,158-167`)

## Deferred

- `[D]` **CAT-API-BROWSE-001**: Browse-by-subject endpoint (e.g. `/subjects/science_fiction.json`). Useful but not in v1; first verify keyword search demand.
- `[D]` **CAT-UI-RECENT-001**: "Recently viewed by your club" sidebar driven by a per-club view-history table. Out of scope until we measure whether members revisit the same titles.
- `[D]` **CAT-API-MULTISRC-001**: Fall back to Google Books when Open Library returns sparse metadata. Adds an API key + quota dependency; defer until we see real metadata-gap reports.
- `[D]` **CAT-BE-PERSIST-CACHE-001**: Promote the in-memory LRU to a Postgres-backed cache so cache survives deploys. Worth doing only once we observe real cache-miss cost in prod.
