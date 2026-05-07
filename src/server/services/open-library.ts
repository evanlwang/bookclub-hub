// Open Library API client.
//
// Two surfaces share this file:
//   1. `searchBooks` — used by the legacy books router (nominate-modal flow).
//      Returns the older `OpenLibraryBook` shape (single-author string).
//   2. `searchPaged` / `getByIsbn` / `getWorkDetail` — used by the catalog
//      router. Returns the richer `CatalogBook` / `CatalogBookDetail` shapes
//      (author array, paging, separate detail call).
//
// Both go through `olJson`, which adds: 5s timeout, User-Agent header,
// 5xx → BAD_GATEWAY, 404 → null, network error → BAD_GATEWAY.
//
// @spec CAT-BE-001, CAT-BE-CACHE-001, CAT-BE-CACHE-002, CAT-BE-RATE-001,
//       CAT-BE-TIMEOUT-001, CAT-BE-FAIL-001, CAT-BE-FAIL-002

import { TRPCError } from "@trpc/server";

// ---------- Public types: legacy ----------

export interface OpenLibraryBook {
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  openLibraryId: string;
  description: string | null;
}

// ---------- Public types: catalog ----------

export interface CatalogBook {
  openLibraryKey: string;
  title: string;
  authorNames: string[];
  firstPublishYear: number | null;
  coverUrl: string | null;
  isbn: string | null;
  pageCount: number | null;
}

export interface CatalogBookDetail extends CatalogBook {
  description: string | null;
  subjects: string[];
  isbns: string[];
}

export interface CatalogSearchResult {
  results: CatalogBook[];
  totalEstimate: number;
}

// ---------- Constants ----------

const BASE_URL = process.env.OPEN_LIBRARY_BASE_URL || "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org";
const USER_AGENT = "BookClubHub/0.1 (+https://github.com/anthropics/bookclub-hub)";
const TIMEOUT_MS = 5_000;
const CACHE_MAX = 200;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h, per CAT-BE-CACHE-001

// ---------- LRU cache with TTL ----------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LruCache<T> {
  private map = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number
  ) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Reinsert to mark as most-recently-used.
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }
}

const searchCache = new LruCache<CatalogSearchResult>(CACHE_MAX, CACHE_TTL_MS);
const editionsCache = new LruCache<string[]>(CACHE_MAX, CACHE_TTL_MS);

// Test-only: flush all caches between tests so module-level state doesn't leak.
export function _resetCatalogCacheForTests(): void {
  searchCache.clear();
  editionsCache.clear();
}

// ---------- Internal HTTP ----------

// @spec CAT-BE-RATE-001, CAT-BE-TIMEOUT-001, CAT-BE-FAIL-001, CAT-BE-FAIL-002
const TIMEOUT_SENTINEL: unique symbol = Symbol("ol-timeout");

async function olJson<T>(path: string): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Resolve (not reject) with a sentinel on timeout. Avoids dangling rejection
  // warnings when the fetch promise stays pending past the timeout (mocks in
  // tests don't honor AbortSignal, and we don't pass one in production yet).
  const timeoutPromise = new Promise<typeof TIMEOUT_SENTINEL>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_SENTINEL), TIMEOUT_MS);
  });

  let raceResult: Response | typeof TIMEOUT_SENTINEL;
  try {
    raceResult = await Promise.race([
      fetch(`${BASE_URL}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      }),
      timeoutPromise,
    ]);
  } catch {
    if (timer) clearTimeout(timer);
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Open Library unreachable",
    });
  }

  if (timer) clearTimeout(timer);

  if (raceResult === TIMEOUT_SENTINEL) {
    throw new TRPCError({
      code: "TIMEOUT",
      message: "Open Library request timed out",
    });
  }

  const res = raceResult;
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Open Library returned ${res.status}`,
    });
  }
  return (await res.json()) as T;
}

// ---------- Internal: Open Library response shapes ----------

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
  first_sentence?: { value: string }[];
}

interface OpenLibrarySearchResponse {
  docs: OpenLibrarySearchDoc[];
  numFound?: number;
}

interface OpenLibraryIsbnRecord {
  title: string;
  works?: { key: string }[];
  covers?: number[];
  number_of_pages?: number;
  isbn_10?: string[];
  isbn_13?: string[];
}

interface OpenLibraryWorkRecord {
  key: string;
  title: string;
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
  authors?: { author: { key: string } }[];
  first_publish_date?: string;
}

interface OpenLibraryAuthorRecord {
  key: string;
  name: string;
}

interface OpenLibraryEdition {
  isbn_10?: string[];
  isbn_13?: string[];
}

interface OpenLibraryEditionsResponse {
  size?: number;
  entries: OpenLibraryEdition[];
}

const EDITIONS_PAGE_SIZE = 50;
const EDITIONS_RESULT_CAP = 10;

// ---------- Public API: legacy ----------

export async function searchBooks(query: string): Promise<OpenLibraryBook[]> {
  const path =
    `/search.json?q=${encodeURIComponent(query)}` +
    `&limit=10` +
    `&fields=key,title,author_name,isbn,cover_i,number_of_pages_median,first_sentence`;
  const data = await olJson<OpenLibrarySearchResponse>(path);
  if (!data) return [];
  return data.docs.map((doc) => ({
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    isbn: doc.isbn?.[0] ?? null,
    coverUrl: doc.cover_i ? `${COVERS_URL}/b/id/${doc.cover_i}-M.jpg` : null,
    pageCount: doc.number_of_pages_median ?? null,
    openLibraryId: doc.key,
    description: doc.first_sentence?.[0]?.value ?? null,
  }));
}

// ---------- Public API: catalog ----------

// @spec CAT-BE-CACHE-002
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

// @spec CAT-API-001, CAT-BE-001, CAT-BE-CACHE-001
export async function searchPaged(args: {
  query: string;
  page: number;
  limit: number;
}): Promise<{ result: CatalogSearchResult; fromCache: boolean }> {
  const norm = normalizeQuery(args.query);
  const cacheKey = `search:${norm}:${args.page}:${args.limit}`;

  const hit = searchCache.get(cacheKey);
  if (hit) return { result: hit, fromCache: true };

  const path =
    `/search.json?q=${encodeURIComponent(norm)}` +
    `&page=${args.page}` +
    `&limit=${args.limit}` +
    `&fields=key,title,author_name,isbn,cover_i,number_of_pages_median,first_publish_year`;

  const data = await olJson<OpenLibrarySearchResponse>(path);
  // /search.json is permissive — 404 isn't expected, but treat as empty if it happens.
  const result: CatalogSearchResult = data
    ? {
        results: data.docs.map(searchDocToCatalogBook),
        totalEstimate: data.numFound ?? 0,
      }
    : { results: [], totalEstimate: 0 };

  searchCache.set(cacheKey, result);
  return { result, fromCache: false };
}

function searchDocToCatalogBook(doc: OpenLibrarySearchDoc): CatalogBook {
  return {
    openLibraryKey: doc.key,
    title: doc.title,
    authorNames: doc.author_name ?? [],
    firstPublishYear: doc.first_publish_year ?? null,
    coverUrl: doc.cover_i ? `${COVERS_URL}/b/id/${doc.cover_i}-M.jpg` : null,
    isbn: doc.isbn?.[0] ?? null,
    pageCount: doc.number_of_pages_median ?? null,
  };
}

// @spec CAT-API-002
export async function getByIsbn(isbn: string): Promise<CatalogBook | null> {
  const isbnRecord = await olJson<OpenLibraryIsbnRecord>(`/isbn/${isbn}.json`);
  if (!isbnRecord) return null;
  const workKey = isbnRecord.works?.[0]?.key;
  if (!workKey) return null;
  const work = await olJson<OpenLibraryWorkRecord>(`${workKey}.json`);
  if (!work) return null;
  const authorNames = await resolveAuthorNames(work);
  const coverId = work.covers?.[0] ?? isbnRecord.covers?.[0] ?? null;
  return {
    openLibraryKey: work.key,
    title: work.title,
    authorNames,
    firstPublishYear: parseYear(work.first_publish_date),
    coverUrl: coverId ? `${COVERS_URL}/b/id/${coverId}-M.jpg` : null,
    isbn,
    pageCount: isbnRecord.number_of_pages ?? null,
  };
}

// @spec CAT-API-003, CAT-BE-EDITIONS-001
export async function getWorkDetail(
  openLibraryKey: string
): Promise<CatalogBookDetail> {
  const work = await olJson<OpenLibraryWorkRecord>(`${openLibraryKey}.json`);
  if (!work) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Work ${openLibraryKey} not found`,
    });
  }
  // Resolve authors and editions in parallel — independent network calls.
  const [authorNames, isbns] = await Promise.all([
    resolveAuthorNames(work),
    isWorkPopular(work) ? getEditions(work.key) : Promise.resolve<string[]>([]),
  ]);
  const coverId = work.covers?.[0] ?? null;
  return {
    openLibraryKey: work.key,
    title: work.title,
    authorNames,
    firstPublishYear: parseYear(work.first_publish_date),
    coverUrl: coverId ? `${COVERS_URL}/b/id/${coverId}-L.jpg` : null,
    isbn: null,
    pageCount: null,
    description: normalizeDescription(work.description),
    subjects: (work.subjects ?? []).slice(0, 8),
    isbns,
  };
}

// @spec CAT-BE-EDITIONS-002
// Curation signal — has a cover AND (description OR ≥3 subjects). Catches
// modern bestsellers, classics, and well-indexed niche works alike. The
// long-tail one-edition shells of Open Library fail this and short-circuit
// the editions request.
function isWorkPopular(work: OpenLibraryWorkRecord): boolean {
  const hasCover = (work.covers?.length ?? 0) > 0;
  const hasDescription = work.description != null;
  const hasSubjects = (work.subjects?.length ?? 0) >= 3;
  return hasCover && (hasDescription || hasSubjects);
}

// @spec CAT-BE-EDITIONS-001, CAT-BE-EDITIONS-003
async function getEditions(workKey: string): Promise<string[]> {
  const cacheKey = `editions:${workKey}`;
  const hit = editionsCache.get(cacheKey);
  if (hit) return hit;

  let data: OpenLibraryEditionsResponse | null;
  try {
    data = await olJson<OpenLibraryEditionsResponse>(
      `${workKey}/editions.json?limit=${EDITIONS_PAGE_SIZE}`
    );
  } catch {
    // Editions failure is non-fatal — detail view still renders without ISBNs.
    return [];
  }
  if (!data) return [];

  const isbns = new Set<string>();
  for (const edition of data.entries ?? []) {
    for (const isbn of edition.isbn_13 ?? []) isbns.add(isbn);
    for (const isbn of edition.isbn_10 ?? []) isbns.add(isbn);
    if (isbns.size >= EDITIONS_RESULT_CAP) break;
  }
  const result = Array.from(isbns).slice(0, EDITIONS_RESULT_CAP);
  editionsCache.set(cacheKey, result);
  return result;
}

async function resolveAuthorNames(work: OpenLibraryWorkRecord): Promise<string[]> {
  const keys = work.authors?.map((a) => a.author.key) ?? [];
  if (keys.length === 0) return [];
  const records = await Promise.all(
    keys.map((k) =>
      olJson<OpenLibraryAuthorRecord>(`${k}.json`).catch(() => null)
    )
  );
  return records
    .filter((r): r is OpenLibraryAuthorRecord => r != null)
    .map((r) => r.name);
}

function normalizeDescription(
  d: string | { value: string } | undefined
): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.value ?? null;
}

function parseYear(s: string | undefined): number | null {
  if (!s) return null;
  const match = s.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}
