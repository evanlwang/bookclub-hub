// @spec VOTE-API-009, VOTE-BE-004, VOTE-API-009-MANUAL, PROG-UI-BOOK-001
import { z } from "zod";
import { router, protectedProcedure, memberProcedure } from "../trpc";
import { searchBooks as searchOpenLibrary } from "../services/open-library";

export const booksRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Run local + Open Library in parallel. We deliberately do NOT
      // short-circuit on a local hit — that would prevent users from
      // nominating any book outside the seeded catalog.
      const localPromise = ctx.db.book.findMany({
        where: {
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
            { author: { contains: input.query, mode: "insensitive" } },
            { isbn: input.query },
          ],
        },
        take: 10,
      });

      const remotePromise = searchOpenLibrary(input.query)
        .then((results) =>
          // Persist each Open Library result so the nominate flow can use
          // the returned bookId. Idempotent via openLibraryId unique constraint.
          Promise.all(
            results.map(async (r) => {
              const existing = await ctx.db.book.findFirst({
                where: { openLibraryId: r.openLibraryId },
              });
              if (existing) {
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
              }
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
            })
          )
        )
        .catch(() => [] as Awaited<ReturnType<typeof ctx.db.book.findMany>>);

      const [local, remote] = await Promise.all([localPromise, remotePromise]);

      // Dedupe by id, prefer local rows so existing nominations stay stable.
      const seen = new Set<string>();
      const merged: typeof local = [];
      for (const b of [...local, ...remote]) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        merged.push(b);
        if (merged.length >= 10) break;
      }
      return merged;
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
