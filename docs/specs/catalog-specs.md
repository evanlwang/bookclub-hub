# Book Search Catalog Specs

**LLD**: docs/llds/book-search-catalog.md _(to be written)_
**Implementing artifacts** _(planned)_:
- API: `src/server/routers/catalog.ts`, `src/server/services/open-library.ts`
- UI: `src/app/clubs/[clubId]/catalog/page.tsx`, `catalog-search.tsx`, `book-detail-panel.tsx`
- Tests: `tests/integration/catalog.test.ts`, `tests/e2e/catalog-search.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap (not yet built) · `[D]` deferred · `[!]` divergence

**Relation to voting specs.** `books.search` (VOTE-API-009) exists already and is purpose-built for the nominate-modal flow: it persists every Open Library hit into the local `Book` table so a `bookId` can be referenced by a `Nomination`. The catalog feature here is a discovery/browse surface — paginated, no auto-persist, no nomination side-effect. Catalog procedures only write to `Book` when a user explicitly imports a result (e.g. nominates from the catalog). See `CAT-BE-002` for the import handoff.

---

## Goals

A free, low-friction way for any club member to search Open Library, browse results with covers, open a detail view, and (optionally) hand the book off to the existing nomination flow. Zero external API cost; graceful degradation when Open Library is slow or down.

---

## Search API

- `[ ]` **CAT-API-001**: The `catalog.search` procedure SHALL accept `{ query: string (1..200 chars), page?: number (default 1, min 1), limit?: number (default 20, min 1, max 50) }` and return `{ results: CatalogBook[], page, limit, totalEstimate, source: "open-library" | "cache" }`. Member-or-above auth (matches the existing `protectedProcedure` pattern in `books.ts`).
- `[ ]` **CAT-API-002**: The `catalog.searchByIsbn` procedure SHALL accept `{ isbn: string }` (10 or 13 digits, hyphens stripped) and return at most one `CatalogBook` or `null`. Resolves via `https://openlibrary.org/isbn/{isbn}.json` then enriches with the parent work record for description and covers.
- `[ ]` **CAT-API-003**: The `catalog.getDetail` procedure SHALL accept `{ openLibraryKey: string }` (e.g. `/works/OL45804W`) and return the full `CatalogBookDetail`: title, authors[], description, firstPublishYear, subjects[], coverUrl (L size), pageCount, isbns[]. Returns `NOT_FOUND` if the key does not resolve.
- `[ ]` **CAT-API-004**: All catalog queries SHALL be safe to call without a `clubId` — discovery is club-agnostic. Procedures live under `protectedProcedure`, not `memberProcedure`.

## Result Shape

- `[ ]` **CAT-BE-001**: `CatalogBook` SHALL be the normalized shape returned to clients: `{ openLibraryKey, title, authorNames: string[], firstPublishYear: number | null, coverUrl: string | null, isbn: string | null, pageCount: number | null }`. Differs from `OpenLibraryBook` (current service shape, single-author) by exposing `authorNames[]` and dropping the `description` field (detail-only).
- `[ ]` **CAT-BE-002**: When a user nominates a catalog result, the calling code SHALL pass the catalog payload to `books.importFromCatalog` (new procedure on the existing books router) which performs the upsert into the `Book` table and returns the internal `bookId`. Catalog procedures themselves SHALL NOT write to `Book`.
- `[ ]` **CAT-BE-003**: `coverUrl` SHALL be `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg` for list views and `-L.jpg` for the detail view. When `cover_i` is absent, `coverUrl` SHALL be `null` and the UI SHALL render a neutral placeholder (no broken image).

## Caching & Rate Limiting

- `[ ]` **CAT-BE-CACHE-001**: The Open Library service SHALL maintain an in-memory LRU keyed by `(endpoint, normalizedQuery, page, limit)` with TTL ≥ 1h and capacity ≥ 200 entries. A cache hit returns immediately and sets `source: "cache"` on the response. Reasoning: Open Library is unauthenticated but expects polite usage (~100 req/min). Aggressive caching makes typeahead viable without hammering them.
- `[ ]` **CAT-BE-CACHE-002**: Query normalization SHALL trim, lowercase, and collapse internal whitespace before cache lookup so `"  Dune  "` and `"dune"` share a cache slot.
- `[ ]` **CAT-BE-RATE-001**: The Open Library service SHALL set `Accept: application/json` and a `User-Agent: BookClubHub/0.1 (+contact)` header on every outbound call (Open Library asks identifiable UAs).
- `[ ]` **CAT-BE-TIMEOUT-001**: Outbound fetches SHALL use an `AbortSignal.timeout(5000)` (5s). On timeout the procedure SHALL throw `TRPCError({ code: "TIMEOUT" })` rather than hang.

## Failure Modes

- `[ ]` **CAT-BE-FAIL-001**: When Open Library returns 5xx or the fetch throws, `catalog.search` SHALL throw `TRPCError({ code: "BAD_GATEWAY", message: "Catalog temporarily unavailable" })`. Differs from `books.search` (VOTE-API-009) which silently returns `[]` for graceful degradation inside the nominate modal — the catalog page wants to show an error so the user knows to retry.
- `[ ]` **CAT-BE-FAIL-002**: `catalog.searchByIsbn` and `catalog.getDetail` SHALL return `null` / throw `NOT_FOUND` for missing records (404 from Open Library) rather than `BAD_GATEWAY`.

## UI — Catalog Page

- `[ ]` **CAT-UI-PAGE-001**: A new route `/clubs/[clubId]/catalog` SHALL be reachable from the club sidebar (link label "Browse books"). The page is server-rendered; the search interaction is a client component.
- `[ ]` **CAT-UI-SEARCH-001**: The page SHALL render a search input at the top with 300ms debounce (consistent with `nominate-modal.tsx`). Empty input → empty state (no API call). On submit/debounce-fire, it calls `catalog.search`.
- `[ ]` **CAT-UI-RESULTS-001**: Results SHALL render as a responsive grid of cards: cover (square aspect, placeholder if null), title (line-clamp-2), authors joined by " · ", first publish year, "Details" link, "Nominate" button (disabled when no active "nominating" round; tooltip explains why).
- `[ ]` **CAT-UI-PAGER-001**: A pager at the bottom shows `Page {n}` with prev/next buttons. Prev disabled on page 1; next disabled when `results.length < limit`. No total-count display (Open Library's count is unreliable for noisy queries).
- `[ ]` **CAT-UI-DETAIL-001**: Clicking "Details" SHALL open a side panel (or modal on mobile) showing large cover, full title, authors, description, first publish year, page count, ISBN(s), subjects (chips, max 8). Lazy-loads via `catalog.getDetail`. Includes "Nominate" CTA with the same active-round gating as the card.
- `[ ]` **CAT-UI-EMPTY-001**: Zero-result query SHALL show the message "No books matched '{query}'." with a hint linking to the manual-entry flow already in the nominate modal.
- `[ ]` **CAT-UI-ERROR-001**: A `BAD_GATEWAY` from `catalog.search` SHALL render an inline retry banner: "Catalog is unavailable right now. Try again." with a Retry button. Per CAT-BE-FAIL-001.
- `[ ]` **CAT-UI-LOADING-001**: While a search is in flight, the results grid SHALL show 6 skeleton cards. Subsequent searches keep prior results visible until the new ones arrive (no flash to empty).

## UI — Nominate-from-Catalog Handoff

- `[ ]` **CAT-UI-NOM-001**: Clicking "Nominate" on any catalog card or detail panel SHALL call `books.importFromCatalog` (CAT-BE-002), then `nominations.create` with the returned `bookId`. On success, a toast confirms "Nominated for current round" with a link to `/clubs/[clubId]/vote`.
- `[ ]` **CAT-UI-NOM-002**: The Nominate button SHALL be visible only when an active round exists and is in "nominating" phase for this club. Otherwise it is hidden and a small inline note explains "Nominations open when your club starts a new round."

## Spoiler Safety

- `[ ]` **CAT-UI-SPOIL-001**: The detail panel SHALL NOT render plot synopses that read as spoiler-laden. Open Library's `description` field is generally safe (jacket-copy style), but if it ever exceeds 1500 chars or contains the substring "spoiler" (case-insensitive), the UI SHALL truncate to first paragraph with a "Show full description" reveal. Cheap, defensive, no NLP.

## Deferred

- `[D]` **CAT-API-BROWSE-001**: Browse-by-subject endpoint (e.g. `/subjects/science_fiction.json`). Useful but not in v1; first verify keyword search demand.
- `[D]` **CAT-UI-RECENT-001**: "Recently viewed by your club" sidebar driven by a per-club view-history table. Out of scope until we measure whether members revisit the same titles.
- `[D]` **CAT-API-MULTISRC-001**: Fall back to Google Books when Open Library returns sparse metadata. Adds an API key + quota dependency; defer until we see real metadata-gap reports.
- `[D]` **CAT-BE-PERSIST-CACHE-001**: Promote the in-memory LRU to a Postgres-backed cache so cache survives deploys. Worth doing only once we observe real cache-miss cost in prod.
