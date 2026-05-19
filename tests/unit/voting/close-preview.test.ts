// @spec VOTE-API-CLOSE-PREVIEW-001
import { describe, it, expect } from "vitest";
import {
  computeClosePreview,
  type CloseNominationInput,
} from "@/lib/voting/close-preview";

function nom(
  id: string,
  voteCount: number,
  createdAt: Date,
  overrides: Partial<CloseNominationInput> = {}
): CloseNominationInput {
  return {
    id,
    title: overrides.title ?? `Title ${id}`,
    author: overrides.author ?? `Author ${id}`,
    voteCount,
    createdAt,
  };
}

describe("computeClosePreview", () => {
  it("returns empty top3, zero totals, and tiedAtTop=0 for no nominations", () => {
    expect(computeClosePreview([])).toEqual({
      top3: [],
      totalVotes: 0,
      tiedAtTop: 0,
    });
  });

  it("ranks by descending vote count and returns at most three rows", () => {
    const input = [
      nom("a", 1, new Date("2026-01-01")),
      nom("b", 4, new Date("2026-01-02")),
      nom("c", 2, new Date("2026-01-03")),
      nom("d", 3, new Date("2026-01-04")),
    ];
    const result = computeClosePreview(input);
    expect(result.top3.map((r) => r.id)).toEqual(["b", "d", "c"]);
    expect(result.totalVotes).toBe(10);
    expect(result.tiedAtTop).toBe(1);
  });

  it("breaks ties at the top by earliest createdAt and reports the tie count", () => {
    const input = [
      nom("late", 3, new Date("2026-01-10")),
      nom("early", 3, new Date("2026-01-01")),
      nom("middle", 3, new Date("2026-01-05")),
    ];
    const result = computeClosePreview(input);
    // Earliest of the 3-vote tier sits first.
    expect(result.top3[0].id).toBe("early");
    expect(result.tiedAtTop).toBe(3);
    expect(result.totalVotes).toBe(9);
  });

  it("computes tiedAtTop only over the top vote count", () => {
    const input = [
      nom("a", 5, new Date("2026-01-01")),
      nom("b", 5, new Date("2026-01-02")),
      nom("c", 1, new Date("2026-01-03")),
      nom("d", 1, new Date("2026-01-04")),
    ];
    const result = computeClosePreview(input);
    expect(result.top3[0].id).toBe("a");
    expect(result.tiedAtTop).toBe(2);
  });

  it("projects only the public id/title/author/voteCount fields onto top3", () => {
    const input = [nom("x", 1, new Date("2026-01-01"))];
    const result = computeClosePreview(input);
    expect(Object.keys(result.top3[0]).sort()).toEqual(
      ["author", "id", "title", "voteCount"].sort()
    );
  });
});
