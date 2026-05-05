// Re-export from factories (fixtures are deprecated, use factories directly)
export {
  createBook as createTestBook,
  insertBook,
  insertAllBooks,
  dune,
  leftHand,
  kindred,
  hailMary,
  piranesi,
  allBooks,
} from "../factories/books";
export type { TestBook } from "../factories/books";
