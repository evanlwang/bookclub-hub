// @spec CAT-API-001, CAT-API-002, CAT-API-003, CAT-API-004,
//        CAT-BE-001, CAT-BE-CACHE-001, CAT-BE-CACHE-002,
//        CAT-BE-RATE-001, CAT-BE-TIMEOUT-001, CAT-BE-FAIL-001, CAT-BE-FAIL-002
//
// Integration tests for the book search catalog router (catalog.ts).
// Tests are RED until the router stubs in src/server/routers/catalog.ts and
// the supporting open-library service are implemented per docs/specs/catalog-specs.md.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetDb } from "@/lib/db.test-utils";
import {
  createAuthenticatedCaller,
  createAnonymousCaller,
} from "@tests/helpers/trpc";
import { alice, insertAllUsers } from "@tests/fixtures/users";
import { _resetCatalogCacheForTests } from "@/server/services/open-library";

const db = getTestDb();

// ---------- Fixture payloads modeling Open Library responses ----------

const duneSearchDoc = {
  key: "/works/OL45804W",
  title: "Dune",
  author_name: ["Frank Herbert"],
  isbn: ["0441172717", "9780441172719"],
  cover_i: 9259,
  number_of_pages_median: 412,
  first_publish_year: 1965,
};

const leftHandSearchDoc = {
  key: "/works/OL453825W",
  title: "The Left Hand of Darkness",
  author_name: ["Ursula K. Le Guin"],
  isbn: ["0441478123"],
  cover_i: 8231180,
  number_of_pages_median: 304,
  first_publish_year: 1969,
};

const duneIsbnRecord = {
  title: "Dune",
  works: [{ key: "/works/OL45804W" }],
  covers: [9259],
  number_of_pages: 412,
  isbn_10: ["0441172717"],
};

const duneWorkRecord = {
  key: "/works/OL45804W",
  title: "Dune",
  description: { value: "Set on the desert planet Arrakis..." },
  subjects: ["Science fiction", "Politics", "Ecology"],
  covers: [9259],
  authors: [{ author: { key: "/authors/OL27349A" } }],
  first_publish_date: "1965",
};

const duneAuthorRecord = {
  key: "/authors/OL27349A",
  name: "Frank Herbert",
};

// ---------- fetch mock router ----------

type FetchMock = ReturnType<typeof vi.fn>;

interface MockResponseOptions {
  status?: number;
  body?: unknown;
  delayMs?: number;
}

function mockResponse({ status = 200, body, delayMs }: MockResponseOptions): Promise<Response> {
  const make = () =>
    new Response(body === undefined ? "" : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  if (delayMs) {
    return new Promise((resolve) => setTimeout(() => resolve(make()), delayMs));
  }
  return Promise.resolve(make());
}

/**
 * Install a global fetch mock that routes by URL substring.
 * Returns the spy so tests can assert on call args (e.g. headers).
 */
function installFetchMock(routes: Array<{ match: (url: string) => boolean; respond: (url: string, init?: RequestInit) => Promise<Response> }>): FetchMock {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    for (const route of routes) {
      if (route.match(url)) return route.respond(url, init);
    }
    throw new Error(`Unrouted fetch in test: ${url}`);
  });
  vi.stubGlobal("fetch", spy);
  return spy as unknown as FetchMock;
}

// ---------- Tests ----------

describe("catalog router", () => {
  beforeEach(async () => {
    await resetDb(db);
    await insertAllUsers(db);
    _resetCatalogCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ============================================================
  // catalog.search
  // ============================================================
  describe("catalog.search", () => {
    // @spec CAT-API-001, CAT-BE-001
    it("returns paginated normalized results with the documented shape", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () =>
            mockResponse({
              body: { docs: [duneSearchDoc, leftHandSearchDoc], numFound: 1234 },
            }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.catalog.search({ query: "dune", page: 1, limit: 20 });

      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.source).toBe("open-library");
      expect(res.totalEstimate).toBe(1234);
      expect(res.results).toHaveLength(2);

      const [first] = res.results;
      expect(first).toEqual({
        openLibraryKey: "/works/OL45804W",
        title: "Dune",
        authorNames: ["Frank Herbert"],
        firstPublishYear: 1965,
        coverUrl: "https://covers.openlibrary.org/b/id/9259-M.jpg",
        isbn: "0441172717",
        pageCount: 412,
      });
    });

    // @spec CAT-API-001
    it("applies default page=1 and limit=20 when omitted", async () => {
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => mockResponse({ body: { docs: [duneSearchDoc], numFound: 1 } }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await caller.catalog.search({ query: "dune" });

      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toMatch(/limit=20/);
      // Open Library uses 1-indexed `page`
      expect(calledUrl).toMatch(/page=1/);
    });

    // @spec CAT-API-001 (input validation)
    it("rejects empty query with BAD_REQUEST", async () => {
      installFetchMock([]);
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(caller.catalog.search({ query: "" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    // @spec CAT-API-001 (input validation)
    it("rejects limit > 50 with BAD_REQUEST", async () => {
      installFetchMock([]);
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(
        caller.catalog.search({ query: "dune", limit: 100 })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    // @spec CAT-API-004
    it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
      installFetchMock([]);
      const caller = createAnonymousCaller(db);

      await expect(caller.catalog.search({ query: "dune" })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    // @spec CAT-BE-CACHE-001
    it("returns source=cache on a repeated identical query without re-hitting fetch", async () => {
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => mockResponse({ body: { docs: [duneSearchDoc], numFound: 1 } }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);

      const first = await caller.catalog.search({ query: "dune", page: 1, limit: 20 });
      expect(first.source).toBe("open-library");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const second = await caller.catalog.search({ query: "dune", page: 1, limit: 20 });
      expect(second.source).toBe("cache");
      expect(second.results).toEqual(first.results);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // @spec CAT-BE-CACHE-002
    it("normalizes whitespace and case for cache lookup", async () => {
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => mockResponse({ body: { docs: [duneSearchDoc], numFound: 1 } }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await caller.catalog.search({ query: "Dune" });
      const second = await caller.catalog.search({ query: "  dune  " });

      expect(second.source).toBe("cache");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // @spec CAT-BE-RATE-001
    it("sends a User-Agent header identifying BookClubHub on outbound calls", async () => {
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => mockResponse({ body: { docs: [], numFound: 0 } }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await caller.catalog.search({ query: "obscurequery" });

      const init = fetchSpy.mock.calls[0][1] as RequestInit | undefined;
      const headers = new Headers(init?.headers);
      expect(headers.get("user-agent") ?? "").toMatch(/BookClubHub/);
      expect(headers.get("accept") ?? "").toMatch(/application\/json/);
    });

    // @spec CAT-BE-FAIL-001
    it("throws BAD_GATEWAY when Open Library returns 5xx", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => mockResponse({ status: 503, body: "upstream down" }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await expect(caller.catalog.search({ query: "dune" })).rejects.toMatchObject({
        code: "BAD_GATEWAY",
      });
    });

    // @spec CAT-BE-TIMEOUT-001
    it("throws TIMEOUT when Open Library exceeds the 5s budget", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          // Resolve well after the procedure-side 5s timeout — but rely on AbortSignal
          // to short-circuit. The procedure should reject before this resolves.
          respond: () => mockResponse({ delayMs: 10_000, body: { docs: [] } }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);

      vi.useFakeTimers();
      const promise = caller.catalog.search({ query: "dune" });
      // Attach the rejection matcher BEFORE advancing timers so the rejection
      // never appears unhandled to Node / vitest.
      const assertion = expect(promise).rejects.toMatchObject({ code: "TIMEOUT" });
      await vi.advanceTimersByTimeAsync(6_000);
      await assertion;
    });

    // @spec CAT-BE-CACHE-001 (negative case — cache must NOT swallow errors)
    it("does not cache failed responses", async () => {
      let calls = 0;
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/search.json"),
          respond: () => {
            calls++;
            return calls === 1
              ? mockResponse({ status: 503 })
              : mockResponse({ body: { docs: [duneSearchDoc], numFound: 1 } });
          },
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await expect(caller.catalog.search({ query: "dune" })).rejects.toBeInstanceOf(TRPCError);

      const retry = await caller.catalog.search({ query: "dune" });
      expect(retry.source).toBe("open-library");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // catalog.searchByIsbn
  // ============================================================
  describe("catalog.searchByIsbn", () => {
    // @spec CAT-API-002
    it("returns a CatalogBook for a known ISBN", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/isbn/0441172717.json"),
          respond: () => mockResponse({ body: duneIsbnRecord }),
        },
        {
          match: (u) => u.includes("/works/OL45804W.json"),
          respond: () => mockResponse({ body: duneWorkRecord }),
        },
        {
          match: (u) => u.includes("/authors/OL27349A.json"),
          respond: () => mockResponse({ body: duneAuthorRecord }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.catalog.searchByIsbn({ isbn: "0441172717" });

      expect(res).not.toBeNull();
      expect(res?.openLibraryKey).toBe("/works/OL45804W");
      expect(res?.title).toBe("Dune");
      expect(res?.authorNames).toEqual(["Frank Herbert"]);
      expect(res?.isbn).toBe("0441172717");
      expect(res?.coverUrl).toBe("https://covers.openlibrary.org/b/id/9259-M.jpg");
    });

    // @spec CAT-API-002 (input normalization)
    it("strips hyphens and accepts both ISBN-10 and ISBN-13", async () => {
      const fetchSpy = installFetchMock([
        {
          match: (u) => u.includes("/isbn/9780441172719.json"),
          respond: () => mockResponse({ body: duneIsbnRecord }),
        },
        {
          match: (u) => u.includes("/works/"),
          respond: () => mockResponse({ body: duneWorkRecord }),
        },
        {
          match: (u) => u.includes("/authors/"),
          respond: () => mockResponse({ body: duneAuthorRecord }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await caller.catalog.searchByIsbn({ isbn: "978-0-441-17271-9" });

      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain("/isbn/9780441172719.json");
    });

    // @spec CAT-API-002 (input validation)
    it("rejects malformed ISBN with BAD_REQUEST", async () => {
      installFetchMock([]);
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(
        caller.catalog.searchByIsbn({ isbn: "not-an-isbn" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    // @spec CAT-BE-FAIL-002
    it("returns null when Open Library has no record for the ISBN", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/isbn/"),
          respond: () => mockResponse({ status: 404 }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.catalog.searchByIsbn({ isbn: "9999999999999" });

      expect(res).toBeNull();
    });
  });

  // ============================================================
  // catalog.getDetail
  // ============================================================
  describe("catalog.getDetail", () => {
    // @spec CAT-API-003
    it("returns the full CatalogBookDetail with description and subjects", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/works/OL45804W.json"),
          respond: () => mockResponse({ body: duneWorkRecord }),
        },
        {
          match: (u) => u.includes("/authors/OL27349A.json"),
          respond: () => mockResponse({ body: duneAuthorRecord }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.catalog.getDetail({ openLibraryKey: "/works/OL45804W" });

      expect(res.openLibraryKey).toBe("/works/OL45804W");
      expect(res.title).toBe("Dune");
      expect(res.authorNames).toEqual(["Frank Herbert"]);
      expect(res.description).toMatch(/Arrakis/);
      expect(res.subjects).toContain("Science fiction");
      expect(res.coverUrl).toMatch(/9259-L\.jpg$/); // detail uses -L size
    });

    // @spec CAT-API-003 (handles description-as-string variant)
    it("normalizes description when Open Library returns a bare string", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/works/OL45804W.json"),
          respond: () =>
            mockResponse({
              body: { ...duneWorkRecord, description: "Plain string description." },
            }),
        },
        {
          match: (u) => u.includes("/authors/OL27349A.json"),
          respond: () => mockResponse({ body: duneAuthorRecord }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      const res = await caller.catalog.getDetail({ openLibraryKey: "/works/OL45804W" });

      expect(res.description).toBe("Plain string description.");
    });

    // @spec CAT-BE-FAIL-002
    it("throws NOT_FOUND when the work key does not resolve", async () => {
      installFetchMock([
        {
          match: (u) => u.includes("/works/"),
          respond: () => mockResponse({ status: 404 }),
        },
      ]);

      const caller = await createAuthenticatedCaller(db, alice);
      await expect(
        caller.catalog.getDetail({ openLibraryKey: "/works/OL00000000W" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    // @spec CAT-API-003 (input validation)
    it("rejects malformed openLibraryKey with BAD_REQUEST", async () => {
      installFetchMock([]);
      const caller = await createAuthenticatedCaller(db, alice);

      await expect(
        caller.catalog.getDetail({ openLibraryKey: "not-a-key" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });
});
