// Open Library API client.
//
// Single surface: `searchBooks` — used by the books router (nominate-modal
// flow). Returns the `OpenLibraryBook` shape (single-author string).
//
// `olJson` adds: 5s timeout, User-Agent header, 5xx → BAD_GATEWAY,
// 404 → null, network error → BAD_GATEWAY.

import { TRPCError } from "@trpc/server";

export interface OpenLibraryBook {
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  openLibraryId: string;
  description: string | null;
}

const BASE_URL = process.env.OPEN_LIBRARY_BASE_URL || "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org";
const USER_AGENT = "BookClubHub/0.1 (+https://github.com/anthropics/bookclub-hub)";
const TIMEOUT_MS = 5_000;

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

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_sentence?: { value: string }[];
}

interface OpenLibrarySearchResponse {
  docs: OpenLibrarySearchDoc[];
  numFound?: number;
}

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
