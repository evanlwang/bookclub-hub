// @spec VOTE-BE-001
import { describe, it, expect } from "vitest";
import {
  tallyVotes,
  type NominationWithVotes,
} from "@/lib/voting/tally";

function makeNomination(
  id: string,
  voteCount: number,
  createdAt: Date
): NominationWithVotes {
  return { id, bookId: `book-${id}`, createdAt, voteCount };
}

describe("tallyVotes", () => {
  it("returns null winner for empty nominations", () => {
    const result = tallyVotes([]);
    expect(result.winner).toBeNull();
    expect(result.rankings).toEqual([]);
  });

  it("returns the single nomination as winner", () => {
    const nominations = [makeNomination("a", 3, new Date("2026-01-01"))];
    const result = tallyVotes(nominations);
    expect(result.winner?.id).toBe("a");
  });

  it("returns the nomination with most votes as winner", () => {
    const nominations = [
      makeNomination("a", 2, new Date("2026-01-01")),
      makeNomination("b", 5, new Date("2026-01-02")),
      makeNomination("c", 3, new Date("2026-01-03")),
    ];
    const result = tallyVotes(nominations);
    expect(result.winner?.id).toBe("b");
    expect(result.rankings[0].id).toBe("b");
    expect(result.rankings[1].id).toBe("c");
    expect(result.rankings[2].id).toBe("a");
  });

  it("breaks ties by earliest nomination timestamp", () => {
    const nominations = [
      makeNomination("a", 3, new Date("2026-01-05")), // later
      makeNomination("b", 3, new Date("2026-01-01")), // earlier — wins tie
      makeNomination("c", 3, new Date("2026-01-03")),
    ];
    const result = tallyVotes(nominations);
    expect(result.winner?.id).toBe("b");
    expect(result.rankings.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("handles all nominations with zero votes", () => {
    const nominations = [
      makeNomination("a", 0, new Date("2026-01-03")),
      makeNomination("b", 0, new Date("2026-01-01")), // earliest wins
      makeNomination("c", 0, new Date("2026-01-02")),
    ];
    const result = tallyVotes(nominations);
    expect(result.winner?.id).toBe("b");
  });

  it("does not mutate the input array", () => {
    const nominations = [
      makeNomination("a", 1, new Date("2026-01-02")),
      makeNomination("b", 2, new Date("2026-01-01")),
    ];
    const originalFirst = nominations[0];
    tallyVotes(nominations);
    expect(nominations[0]).toBe(originalFirst);
  });
});
