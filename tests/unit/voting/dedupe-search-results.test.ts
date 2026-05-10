// @spec VOTE-API-009-DEDUP
import { describe, it, expect } from "vitest";
import {
  dedupeSearchResults,
  type SearchResultRow,
} from "@/lib/voting/dedupe-search-results";

function makeBook(overrides: Partial<SearchResultRow>): SearchResultRow {
  return {
    id: overrides.id ?? "book-x",
    title: overrides.title ?? "Some Title",
    author: overrides.author ?? "Some Author",
    isbn: overrides.isbn ?? null,
  };
}

describe("dedupeSearchResults", () => {
  it("returns rows unchanged when no duplicates exist", () => {
    const rows = [
      makeBook({ id: "a", title: "Dune", author: "Frank Herbert" }),
      makeBook({ id: "b", title: "Foundation", author: "Isaac Asimov" }),
    ];
    expect(dedupeSearchResults(rows)).toEqual(rows);
  });

  it("collapses rows that share the same primary id", () => {
    const row = makeBook({ id: "a", title: "Dune", author: "Frank Herbert" });
    const result = dedupeSearchResults([row, row]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("collapses a manual entry and an Open Library entry with the same title+author (case/whitespace insensitive)", () => {
    const manual = makeBook({
      id: "manual-1",
      title: "Pride and Prejudice",
      author: "Jane Austen",
      isbn: null,
    });
    const remote = makeBook({
      id: "ol-1",
      title: "  PRIDE AND prejudice ",
      author: "jane austen",
      isbn: null,
    });
    const result = dedupeSearchResults([manual, remote]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("manual-1");
  });

  it("collapses two rows that share a normalized ISBN even when title/author differ in punctuation", () => {
    const a = makeBook({
      id: "a",
      title: "Dune (50th Anniversary)",
      author: "F. Herbert",
      isbn: "978-0-441-17271-9",
    });
    const b = makeBook({
      id: "b",
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780441172719",
    });
    const result = dedupeSearchResults([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("does NOT collapse rows with different ISBNs even if title+author match (different editions deliberately distinct)", () => {
    const hardcover = makeBook({
      id: "a",
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780441172719",
    });
    const paperback = makeBook({
      id: "b",
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780593098233",
    });
    const result = dedupeSearchResults([hardcover, paperback]);
    expect(result).toHaveLength(2);
  });

  it("falls back to title+author when only one of two rows has an ISBN", () => {
    const withIsbn = makeBook({
      id: "a",
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780441172719",
    });
    const withoutIsbn = makeBook({
      id: "b",
      title: "Dune",
      author: "Frank Herbert",
      isbn: null,
    });
    const result = dedupeSearchResults([withIsbn, withoutIsbn]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("preserves the earlier-appearing row (local-first ordering)", () => {
    const first = makeBook({ id: "local", title: "Dune", author: "Frank Herbert" });
    const second = makeBook({ id: "remote", title: "Dune", author: "Frank Herbert" });
    const result = dedupeSearchResults([first, second]);
    expect(result.map((r) => r.id)).toEqual(["local"]);
  });
});
