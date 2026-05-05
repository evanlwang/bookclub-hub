import { type PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export interface TestBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  pageCount?: number;
  openLibraryId?: string;
}

export function createTestBook(overrides?: Partial<TestBook>): TestBook {
  return {
    id: randomUUID(),
    title: "Test Book",
    author: "Test Author",
    ...overrides,
  };
}

export const dune = createTestBook({
  title: "Dune",
  author: "Frank Herbert",
  isbn: "978-0441172719",
  pageCount: 412,
  openLibraryId: "/works/OL893415W",
});

export const leftHand = createTestBook({
  title: "The Left Hand of Darkness",
  author: "Ursula K. Le Guin",
  isbn: "978-0441478125",
  pageCount: 304,
  openLibraryId: "/works/OL59864W",
});

export const hailMary = createTestBook({
  title: "Project Hail Mary",
  author: "Andy Weir",
  isbn: "978-0593135204",
  pageCount: 476,
  openLibraryId: "/works/OL24208257W",
});

export const kindred = createTestBook({
  title: "Kindred",
  author: "Octavia Butler",
  isbn: "978-0807083697",
  pageCount: 264,
  openLibraryId: "/works/OL15195011W",
});

export const piranesi = createTestBook({
  title: "Piranesi",
  author: "Susanna Clarke",
  isbn: "978-1635575996",
  pageCount: 272,
  openLibraryId: "/works/OL20897041W",
});

export const allBooks = [dune, leftHand, hailMary, kindred, piranesi];

export async function insertBook(db: PrismaClient, book: TestBook) {
  return db.book.create({
    data: {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      pageCount: book.pageCount,
      openLibraryId: book.openLibraryId,
    },
  });
}

export async function insertAllBooks(db: PrismaClient) {
  for (const book of allBooks) {
    await insertBook(db, book);
  }
}
