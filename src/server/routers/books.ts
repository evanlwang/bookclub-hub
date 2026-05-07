// @spec VOTE-API-009, VOTE-BE-004, VOTE-API-009-MANUAL, PROG-UI-BOOK-001, CAT-BE-002
import { z } from "zod";
import { router, protectedProcedure, memberProcedure } from "../trpc";
import { searchBooks as searchOpenLibrary } from "../services/open-library";

export const booksRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Check local cache first
      const cached = await ctx.db.book.findMany({
        where: {
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { author: { contains: input.query, mode: "insensitive" } },
            { isbn: input.query },
          ],
        },
        take: 10,
      });

      if (cached.length > 0) {
        return cached;
      }

      // Query Open Library
      try {
        const results = await searchOpenLibrary(input.query);

        // Cache results locally using proper findFirst → create/update logic
        const books = await Promise.all(
          results.map(async (r) => {
            const existing = await ctx.db.book.findFirst({
              where: { openLibraryId: r.openLibraryId },
            });

            if (existing) {
              // Update existing record with latest metadata
              return ctx.db.book.update({
                where: { id: existing.id },
                data: {
                  title: r.title,
                  author: r.author,
                  isbn: r.isbn,
                  coverUrl: r.coverUrl,
                  pageCount: r.pageCount,
                  description: r.description,
                },
              });
            } else {
              // Create new record
              return ctx.db.book.create({
                data: {
                  title: r.title,
                  author: r.author,
                  isbn: r.isbn,
                  coverUrl: r.coverUrl,
                  pageCount: r.pageCount,
                  openLibraryId: r.openLibraryId,
                  description: r.description,
                },
              });
            }
          })
        );

        return books;
      } catch {
        // API unavailable — return empty, user can enter manually
        return [];
      }
    }),

  // @spec VOTE-API-009-MANUAL
  createManual: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        author: z.string().min(1).max(500),
        isbn: z.string().optional(),
        pageCount: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.book.create({
        data: {
          title: input.title,
          author: input.author,
          isbn: input.isbn,
          pageCount: input.pageCount,
          // openLibraryId deliberately omitted — null for manual entries
        },
      });

      return { book };
    }),

  // @spec CAT-BE-002
  // Bridge from catalog discovery (which never writes to Book) into the
  // nomination flow (which needs an internal bookId). Upsert by openLibraryKey.
  importFromCatalog: protectedProcedure
    .input(
      z.object({
        openLibraryKey: z.string().regex(/^\/works\/OL\d+W$/),
        title: z.string().min(1).max(500),
        authorNames: z.array(z.string().min(1)).min(1),
        isbn: z.string().nullable().optional(),
        coverUrl: z.string().url().nullable().optional(),
        pageCount: z.number().int().positive().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const author = input.authorNames.join(", ");
      const existing = await ctx.db.book.findFirst({
        where: { openLibraryId: input.openLibraryKey },
      });
      if (existing) {
        const updated = await ctx.db.book.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            author,
            // Prefer fresh non-null values; preserve existing data we already have.
            isbn: input.isbn ?? existing.isbn,
            coverUrl: input.coverUrl ?? existing.coverUrl,
            pageCount: input.pageCount ?? existing.pageCount,
          },
        });
        return { bookId: updated.id, created: false };
      }
      const created = await ctx.db.book.create({
        data: {
          title: input.title,
          author,
          isbn: input.isbn ?? null,
          coverUrl: input.coverUrl ?? null,
          pageCount: input.pageCount ?? null,
          openLibraryId: input.openLibraryKey,
        },
      });
      return { bookId: created.id, created: true };
    }),

  // @spec PROG-UI-BOOK-001
  listForClub: memberProcedure
    .input(z.object({ clubId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const selections = await ctx.db.bookSelection.findMany({
        where: { clubId: input.clubId },
        include: { book: true },
        orderBy: { selectedAt: "desc" },
      });

      return selections.map((s) => s.book);
    }),
});
