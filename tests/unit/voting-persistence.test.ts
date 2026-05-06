// @spec VOTE-UI-PRIOR-VOTES-001, VOTE-UI-PRIOR-VOTES-002, VOTE-UI-UPDATE-CONFIRM-001
import { describe, it, expect } from "vitest";
import {
  derivePriorVotes,
  isUpdateMode,
  successMessage,
} from "@/lib/voting/prior-votes";

const ALICE = "user-alice";
const BOB = "user-bob";

const noms = (entries: { id: string; voters?: string[] }[]) =>
  entries.map(({ id, voters = [] }) => ({
    id,
    votes: voters.map((userId) => ({ userId, nominationId: id })),
  }));

describe("derivePriorVotes", () => {
  // @spec VOTE-UI-PRIOR-VOTES-001
  it("returns the nomination IDs the user voted for", () => {
    const nominations = noms([
      { id: "nom-1", voters: [ALICE] },
      { id: "nom-2", voters: [BOB] },
      { id: "nom-3", voters: [ALICE, BOB] },
    ]);

    expect(derivePriorVotes(nominations, ALICE)).toEqual(["nom-1", "nom-3"]);
  });

  // @spec VOTE-UI-PRIOR-VOTES-001
  it("returns an empty array when the user has not voted", () => {
    const nominations = noms([
      { id: "nom-1", voters: [BOB] },
      { id: "nom-2", voters: [BOB] },
    ]);

    expect(derivePriorVotes(nominations, ALICE)).toEqual([]);
  });

  // @spec VOTE-UI-PRIOR-VOTES-001
  it("returns an empty array when no nominations have any votes", () => {
    const nominations = noms([
      { id: "nom-1" },
      { id: "nom-2" },
    ]);

    expect(derivePriorVotes(nominations, ALICE)).toEqual([]);
  });

  // @spec VOTE-UI-PRIOR-VOTES-001
  it("preserves nomination order", () => {
    // Server returns nominations in createdAt order; we need to keep that ordering
    // so the UI's selected state matches what the user toggled.
    const nominations = noms([
      { id: "z-last", voters: [ALICE] },
      { id: "m-mid", voters: [] },
      { id: "a-first", voters: [ALICE] },
    ]);

    expect(derivePriorVotes(nominations, ALICE)).toEqual(["z-last", "a-first"]);
  });

  // @spec VOTE-UI-PRIOR-VOTES-001
  it("handles nominations whose votes field is null or undefined", () => {
    // Defensive: tRPC client could return null for the votes field if upstream
    // shape changes. Don't crash.
    const nominations = [
      { id: "nom-1", votes: null },
      { id: "nom-2" },
      { id: "nom-3", votes: [{ userId: ALICE, nominationId: "nom-3" }] },
    ];

    expect(derivePriorVotes(nominations, ALICE)).toEqual(["nom-3"]);
  });

  // @spec VOTE-API-VISIBILITY-001 (defense-in-depth)
  it("filters by userId so other members' votes never leak through", () => {
    // Even if the server somehow returns multiple users' votes (e.g., during
    // the 'decided' phase), this helper only surfaces the calling user's votes.
    const nominations = noms([
      { id: "nom-1", voters: [ALICE, BOB] },
      { id: "nom-2", voters: [BOB] },
    ]);

    expect(derivePriorVotes(nominations, ALICE)).toEqual(["nom-1"]);
    expect(derivePriorVotes(nominations, BOB)).toEqual(["nom-1", "nom-2"]);
  });
});

describe("isUpdateMode", () => {
  // @spec VOTE-UI-PRIOR-VOTES-002
  it("is true when prior votes exist (revisit case)", () => {
    expect(isUpdateMode(["nom-1"], false)).toBe(true);
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  it("is true immediately after a successful in-session submit", () => {
    expect(isUpdateMode([], true)).toBe(true);
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  it("is true when both prior votes exist AND user just submitted again", () => {
    expect(isUpdateMode(["nom-1", "nom-2"], true)).toBe(true);
  });

  // @spec VOTE-UI-PRIOR-VOTES-002
  it("is false for a first-time voter who hasn't submitted yet", () => {
    expect(isUpdateMode([], false)).toBe(false);
  });
});

describe("successMessage", () => {
  // @spec VOTE-UI-UPDATE-CONFIRM-001
  it('returns "recorded" copy on first submission', () => {
    expect(successMessage(false)).toBe("✓ Your votes have been recorded");
  });

  // @spec VOTE-UI-UPDATE-CONFIRM-001
  it('returns "updated" copy on subsequent submissions', () => {
    expect(successMessage(true)).toBe("✓ Your votes have been updated");
  });
});
