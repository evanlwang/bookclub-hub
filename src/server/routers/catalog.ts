// @spec CAT-API-001, CAT-API-002, CAT-API-003, CAT-API-004
//
// Book Search Catalog router — discovery surface over Open Library.
// Distinct from `books.ts`: catalog procedures do NOT persist to the local
// `Book` table. Persistence happens only when a user explicitly imports a
// catalog result via `books.importFromCatalog` (CAT-BE-002), which is a
// separate procedure on the existing books router.
//
// Spec: docs/specs/catalog-specs.md
// LLD:  docs/llds/book-search-catalog.md (TBD)
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

// ---------- Public response shapes ----------

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

export interface CatalogSearchResponse {
  results: CatalogBook[];
  page: number;
  limit: number;
  totalEstimate: number;
  source: "open-library" | "cache";
}

// ---------- Input schemas ----------

const searchInput = z.object({
  query: z.string().trim().min(1).max(200),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

const isbnInput = z.object({
  // 10 or 13 digits after stripping hyphens; transform normalizes.
  isbn: z
    .string()
    .transform((s) => s.replace(/-/g, ""))
    .pipe(z.string().regex(/^(\d{10}|\d{13})$/, "ISBN must be 10 or 13 digits")),
});

const detailInput = z.object({
  // e.g. "/works/OL45804W"
  openLibraryKey: z.string().regex(/^\/works\/OL\d+W$/),
});

// ---------- Router ----------

export const catalogRouter = router({
  // @spec CAT-API-001, CAT-BE-001, CAT-BE-CACHE-001, CAT-BE-FAIL-001, CAT-BE-TIMEOUT-001
  search: protectedProcedure
    .input(searchInput)
    .query(async ({ input }): Promise<CatalogSearchResponse> => {
      // TODO(CAT-API-001):
      //   1. Normalize input.query (trim/lowercase/collapse-ws) — CAT-BE-CACHE-002
      //   2. LRU lookup keyed by ("search", normQuery, page, limit)
      //   3. On miss: call openLibrary.searchPaged({ query, page, limit }) with 5s timeout
      //   4. Map docs → CatalogBook[] (multi-author array, no description)
      //   5. Store in LRU; return { results, page, limit, totalEstimate, source }
      //   6. On 5xx/timeout: throw BAD_GATEWAY (CAT-BE-FAIL-001)
      void input;
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "catalog.search not implemented (CAT-API-001)",
      });
    }),

  // @spec CAT-API-002, CAT-BE-FAIL-002
  searchByIsbn: protectedProcedure
    .input(isbnInput)
    .query(async ({ input }): Promise<CatalogBook | null> => {
      // TODO(CAT-API-002):
      //   1. GET https://openlibrary.org/isbn/{isbn}.json
      //      - 404 → return null (not BAD_GATEWAY per CAT-BE-FAIL-002)
      //   2. Follow `works[0].key` → fetch work record for description/cover_i
      //   3. Map to CatalogBook (single-result shape)
      void input;
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "catalog.searchByIsbn not implemented (CAT-API-002)",
      });
    }),

  // @spec CAT-API-003, CAT-BE-FAIL-002, CAT-UI-SPOIL-001
  getDetail: protectedProcedure
    .input(detailInput)
    .query(async ({ input }): Promise<CatalogBookDetail> => {
      // TODO(CAT-API-003):
      //   1. GET https://openlibrary.org/{openLibraryKey}.json
      //      - 404 → throw NOT_FOUND
      //   2. Resolve author refs (each authors[i].author.key) — small fanout, cache aggressively
      //   3. Pull description (string or {value: string}), subjects[0..7], cover_i (-L size)
      //   4. Pull representative ISBNs from edition list (separate endpoint; cap at first page)
      //   5. Spoiler guard (CAT-UI-SPOIL-001) is a UI concern — return raw description here
      void input;
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "catalog.getDetail not implemented (CAT-API-003)",
      });
    }),
});
