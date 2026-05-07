# Book Search Catalog

## Context and Design Philosophy

The catalog is a **discovery surface**: a free, low-friction way for any club member to browse Open Library, see covers and metadata, and (when an active nominating round exists) push a book into the existing voting flow. It sits alongside the nomination modal — not in front of it — because the two surfaces have different jobs:

- The **nominate modal** is goal-directed: "I know what I want to nominate, find it fast, accept that I might enter it manually." It silently swallows API errors, persists every search hit to `Book` so a `bookId` is always available, and keeps the flow inside one popover.
- The **catalog** is exploratory: "What's out there?" It paginates, surfaces rich detail, fails loudly so the user knows to retry, and refuses to pollute `Book` on every keystroke. Persistence happens only when the user explicitly nominates.

The free constraint pushes us to **Open Library** — no API key, no quota, but crowdsourced metadata that is sometimes patchy. We accept that gap and degrade gracefully (placeholder cover, "Unknown author") rather than reject sparse records.

The architectural decision that drops out of all this: **catalog procedures never write to the database.** A separate procedure on the `books` router (`books.importFromCatalog`) is the only path from a discovered Open Library work to a local `Book` row. This keeps the read-only browse path cheap and the write path explicit.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Architecture Layers

```
UI (catalog-client.tsx, catalog-result-card.tsx, catalog-detail-panel.tsx)
   │   debounced fetch via raw /api/trpc URLs (matches nominate-modal style)
   ▼
tRPC routers
   ├─ catalog.ts       — search / searchByIsbn / getDetail (read-only, no DB)
   └─ books.ts         — importFromCatalog (the only catalog→DB bridge)
   │
   ▼
Service layer (services/open-library.ts)
   ├─ olJson<T>()      — the single egress point. Adds UA, timeout, error mapping
   ├─ LruCache<T>      — in-memory, TTL, used only for search responses
   ├─ searchPaged()    — cache lookup + olJson
   ├─ getByIsbn()      — two-hop: ISBN record → work record → author parallel
   └─ getWorkDetail()  — work + author parallel
```

Every outbound HTTP call goes through `olJson`. That gives one place to enforce the User-Agent header, the 5s timeout, and the `5xx → BAD_GATEWAY` / `404 → null` / network-error → `BAD_GATEWAY` mapping. The legacy `searchBooks` (used by the nominate modal) was rerouted through `olJson` too — it inherits the timeout and UA for free.

## Result Shape

The catalog exposes a richer normalized shape than the legacy nominate-modal flow:

| Field | Type | Source | List | Detail |
|---|---|---|---|---|
| `openLibraryKey` | `string` | `doc.key` | ✓ | ✓ |
| `title` | `string` | `doc.title` | ✓ | ✓ |
| `authorNames` | `string[]` | `doc.author_name` (search) or resolved via `/authors/{key}.json` (detail/isbn) | ✓ | ✓ |
| `firstPublishYear` | `number \| null` | `doc.first_publish_year` (search) or parsed from `work.first_publish_date` (detail) | ✓ | ✓ |
| `coverUrl` | `string \| null` | `covers.openlibrary.org/b/id/{cover_i}-{M\|L}.jpg` | M | L |
| `isbn` | `string \| null` | `doc.isbn[0]` (search) or input (isbn lookup) | ✓ | ✓ |
| `pageCount` | `number \| null` | `doc.number_of_pages_median` (search) or `isbn_record.number_of_pages` | ✓ | ✓ |
| `description` | `string \| null` | `work.description` (string or `{value}`) | — | ✓ |
| `subjects` | `string[]` | `work.subjects` (cap 8) | — | ✓ |

Two normalizations worth flagging:
1. **Description shape coercion.** Open Library returns `description` as either a plain string or `{value: string}`. `normalizeDescription()` collapses both.
2. **Year extraction.** `work.first_publish_date` is a free-form string ("1965", "January 1965", "March 12, 2003"). `parseYear()` greps the first 4-digit run.

When a normalized field is null, the UI renders a neutral placeholder (📖 emoji for missing covers, "Unknown author" for empty `authorNames`). No broken images, no "[object Object]".

## Cache Design

```
search request
   │
   ▼
normalizeQuery(q) = q.trim().toLowerCase().replace(/\s+/g, " ")
   │
   ▼
key = `search:${normQuery}:${page}:${limit}`
   │
   ▼
LruCache.get(key)
   ├─ hit (and not expired) → return { result, fromCache: true }
   └─ miss → olJson() → on success, LruCache.set(key, result) → { result, fromCache: false }
```

**In-memory and not Postgres** because the typical hit pattern is a single user typing — the cache is most valuable for the same person retyping the same letters within seconds. Survival across deploys isn't useful enough to justify a Postgres round-trip on every search. Promote to Postgres-backed only if observed cache miss rate is high in prod (`CAT-BE-PERSIST-CACHE-001` deferred).

**Search only, not detail or ISBN** because (a) detail clicks are rarer than typeahead by ~10x and (b) we don't yet know whether they cluster on the same titles. Both can be added later without changing the public shape.

**Capacity 200 / TTL 1h** — chosen by hand from the math: 20 results × 50 typical queries / 5 minutes ≈ stays under cap; an hour gives plenty of room for a single browse session without going stale on Open Library updates.

**Failed responses do not enter the cache.** A 503 must not poison the next attempt. The `searchCache.set` call is gated on a successful `olJson` return.

## Timeout Design

Spec calls for a 5s budget with `TRPCError({ code: "TIMEOUT" })` on expiry. Implementation uses **`Promise.race` with a resolving sentinel** rather than `AbortSignal.timeout`:

```
Promise.race([
  fetch(url, { headers }),          // real fetch
  timeoutPromise → resolves to TIMEOUT_SENTINEL after 5s
])
```

**Why divergent:** mocked `fetch` in tests does not honor `AbortSignal`, so an abort-based timeout would hang waiting on the unaborted mock. The race + sentinel pattern is observable from tests with fake timers and behaves identically in production — Open Library's real fetch *would* honor abort, but we don't currently propagate cancellation downstream of the race anyway.

**Cost of the divergence:** in production a runaway request still consumes a connection until it naturally completes. Acceptable for v1; revisit if connection pool exhaustion shows up. Marked `[!]` divergence on `CAT-BE-TIMEOUT-001`.

## Failure Mode Map

```
                   ┌─ olJson() ─┐
                   │            │
  5xx ────────────►│            ├──► throw TRPCError(BAD_GATEWAY)
  network err ────►│            │
  fetch reject ───►│            │
                   │            │
  404 ────────────►│            ├──► return null
                   │            │
  TIMEOUT_SENTINEL►│            ├──► throw TRPCError(TIMEOUT)
                   └────────────┘

  search → null treated as empty results
  searchByIsbn → null returned to client
  getDetail → null mapped to TRPCError(NOT_FOUND)
```

Catalog procedures **throw** `BAD_GATEWAY`, in deliberate contrast to the legacy `books.search` which **swallows** errors and returns `[]`. The two surfaces have different UX needs:
- Nominate modal needs a manual-entry escape hatch — silent fail is fine; the user has another path.
- Catalog page is the path; failure must be visible so the user can retry.

## UI Layout

```
/clubs/[clubId]/catalog/page.tsx              [server component]
├─ resolves clubId
├─ rounds.list → finds active "nominating" round
├─ passes nominatingRoundId (string|null) to client
└─ <Suspense><CatalogClient/></Suspense>      [needed for useSearchParams]

CatalogClient                                  [client component, the orchestrator]
├─ URL-synced: ?q=, ?page=
├─ Local: results[], loading, error, selectedKey, nominatedKeys (Set), retryNonce
├─ Refs: debounceRef (timer), requestIdRef (stale-response guard)
├─ Renders:
│  ├─ Search input (300ms debounce, spinner on right)
│  ├─ Inline gating note (when canNominate=false)
│  ├─ Inline success/error banners (post-nominate)
│  ├─ Body switches on state:
│  │  ├─ error="gateway" → <retry banner>
│  │  ├─ q="" → <initial empty state>
│  │  ├─ loading + no results → <SkeletonGrid/>
│  │  ├─ q≠"" + results=[] → <empty state>
│  │  └─ results.length>0 → <grid> + <pager>
│  └─ {selectedKey && <CatalogDetailPanel/>}
└─ <CatalogResultCard> per result

CatalogDetailPanel                              [client component]
├─ Lazy-fetches catalog.getDetail on mount/openLibraryKey change
├─ Slide-out from right (md+) | full-screen modal (mobile)
├─ Esc closes; backdrop click closes
├─ Spoiler-truncate: if description.length > 1500 OR /spoiler/i, show
│   first paragraph + "Show full description" button
└─ Nominate CTA gated on canNominate prop
```

### URL state vs local state

URL: `q`, `page`. Both are **shareable** and **survive reload**. Useful for "I found this query, share with the club" and for back-button behavior between detail clicks (when we add detail-key-to-URL someday).

Local: `selectedKey`, `nominatedKeys`, `nominateError`, `retryNonce`, debounce/request refs. All transient — opening a detail panel shouldn't be back-button-significant.

### Loading invariant (CAT-UI-LOADING-001)

The skeleton grid only renders when `results.length === 0 && loading`. Once we have results, subsequent searches show a spinner in the input but **keep prior results visible** until the new ones arrive. This avoids the "flash to empty" feel during typeahead.

### Stale-response guard

Each fetch increments `requestIdRef.current`. The success callback drops responses whose `requestId !== requestIdRef.current`. Without this, a slow response for "dun" can clobber the fast response for "dune".

## Nominate Handoff

```
user → click "Nominate" on card or detail panel
     │
     ▼
catalog-client: handleNominate(book)
     │
     ├──► POST /api/trpc/books.importFromCatalog
     │       { openLibraryKey, title, authorNames, isbn, coverUrl, pageCount }
     │       ─► upsert by openLibraryKey
     │       ─► returns { bookId, created }
     │
     ├──► POST /api/trpc/nominations.create
     │       { clubId, roundId: nominatingRoundId, bookId }
     │       ─► CONFLICT (already nominated)? swallow as success
     │       ─► other errors? throw, surface to inline error banner
     │
     ▼
state updates:
  nominatedKeys.add(openLibraryKey)         → button shows "✓ Nominated"
  lastNominatedTitle = book.title           → success banner appears
  with link → /clubs/[clubId]/vote
```

CONFLICT is treated as success because the user's intent ("I want this nominated") is satisfied either way. It would be confusing to show an error message that reads "already nominated" — same observable outcome.

The success **banner** (not a toast) is a deliberate divergence from the spec text. Reason: this codebase has no toast system, and `vote-round.tsx` already establishes inline-message-under-the-action as the confirmation pattern. Adding a toast library for one message isn't worth the dependency. Marked `[!]` on `CAT-UI-NOM-001`.

## Button Inventory

Exact rendered labels in the running app, with conditions and handlers.

Button: search input (debounced) — `catalog-client.tsx:198-218` — visible: always — handler: `catalog.search` after 300ms debounce, resets page to 1
Button: "Details" (per result row) — `catalog-result-card.tsx:78-86` — visible: card visible — handler: opens `<CatalogDetailPanel openLibraryKey={...}>`
Button: "Nominate" (per result row) — `catalog-result-card.tsx:87-99` — visible: `canNominate=true` — enabled: not in `nominatedKeys` — handler: `books.importFromCatalog` then `nominations.create`
Button: "✓ Nominated" (disabled state) — visible: same row but `nominatedKeys` contains its key — terminal state for that card in this session
Button: "← Previous" — `catalog-client.tsx:269-276` — visible: results present — enabled: `page > 1 && !loading` — handler: decrement `page` (effect re-runs search)
Button: "Next →" — `catalog-client.tsx:280-288` — visible: results present — enabled: `hasFullPage && !loading` — handler: increment `page`
Button: "Retry" — `catalog-client.tsx:218-226` — visible: `error="gateway"` — handler: bumps `retryNonce` to re-fire the search effect
Button: "Show full description" — `catalog-detail-panel.tsx:158-167` — visible: detail loaded AND (description > 1500 chars OR matches `/spoiler/i`) AND `!showFullDescription` — handler: reveals full description in-place
Button: "Nominate this book" / "✓ Nominated for current round" — `catalog-detail-panel.tsx:184-200` — visible: `canNominate=true` — same handler chain as the card-level button
Button: "View round" (in success banner) — `catalog-client.tsx:204-209` — visible: most recent nominate succeeded — handler: navigates to `/clubs/[clubId]/vote`
Button: panel close X / Esc / backdrop click — `catalog-detail-panel.tsx:97-104,75-79,90-96` — handler: clears `selectedKey`

## Spoiler Guard

Catalog detail panel renders a `description` field that comes straight from Open Library. Open Library's descriptions are usually jacket-copy style and safe by default. We add a defensive truncate as a hedge:

```
description.length > 1500 OR /spoiler/i.test(description)
   └── render first paragraph + "Show full description" reveal
```

No NLP, no third-party scrubber. The truncate is best-effort; the reveal is one click. `CAT-UI-SPOIL-001`.

## Data Model Notes

The catalog feature **adds no new tables**. It reuses `Book` for imports, with the existing `openLibraryId @unique` constraint as the upsert key.

Edge case worth knowing: `Book.author` is a single string. `CatalogBook.authorNames` is an array. `books.importFromCatalog` joins with `", "` as the lossy-but-truthful collapse. Multi-author works render as `"Niven, Larry, Pournelle, Jerry"` rather than dropping co-authors. Display sites (`vote-round.tsx`, dashboard) use `Book.author` directly and handle the longer string fine.

## Gaps and Deferred

- `[ ]` Detail panel does not expose ISBN(s) yet — `CatalogBookDetail.isbns` is wired but always empty (Open Library's ISBN list is on the editions endpoint, not the work endpoint, and we haven't paginated through them).
- `[D]` `CAT-API-BROWSE-001` — browse-by-subject. Defer until we see the user-facing want.
- `[D]` `CAT-UI-RECENT-001` — "recently viewed by your club" sidebar. Needs a per-club view-history table; defer until measured.
- `[D]` `CAT-API-MULTISRC-001` — Google Books fallback when Open Library is sparse. Adds an API key dependency; defer until metadata-gap reports come in.
- `[D]` `CAT-BE-PERSIST-CACHE-001` — Postgres-backed cache. Defer until in-memory cache miss rate is observed and meaningful.
- `[ ]` `searchByIsbn` is implemented and tested but not yet wired to the UI. A "paste an ISBN" affordance in the search bar would make it user-reachable.

## References

- Spec: `docs/specs/catalog-specs.md`
- Service: `src/server/services/open-library.ts`
- Routers: `src/server/routers/catalog.ts`, `src/server/routers/books.ts` (importFromCatalog)
- UI: `src/app/clubs/[clubId]/catalog/`
- Tests: `tests/integration/catalog.test.ts`, `tests/integration/books.test.ts`, `tests/e2e/catalog-search.spec.ts`
- Open Library docs: https://openlibrary.org/developers/api
