// @spec VOTE-API-ADVANCE-MINNOMS-001
import { describe, it, expect } from "vitest";
import { canAdvanceFromNominating } from "@/lib/voting/advance-guard";

describe("canAdvanceFromNominating", () => {
  it("returns ok when status is nominating and nominationCount >= 2", () => {
    expect(canAdvanceFromNominating("nominating", 2)).toEqual({ ok: true });
    expect(canAdvanceFromNominating("nominating", 5)).toEqual({ ok: true });
  });

  it("returns an error reason when nominating with fewer than 2 nominations", () => {
    expect(canAdvanceFromNominating("nominating", 0)).toEqual({
      ok: false,
      reason: "Need at least 2 nominations to advance to voting",
    });
    expect(canAdvanceFromNominating("nominating", 1)).toEqual({
      ok: false,
      reason: "Need at least 2 nominations to advance to voting",
    });
  });

  it("returns ok for any non-nominating status — guard only applies to the nominating→voting transition", () => {
    // The voting→decided and other transitions are governed elsewhere; this
    // pure guard only owns the nomination-count rule for nominating→voting.
    expect(canAdvanceFromNominating("voting", 0)).toEqual({ ok: true });
    expect(canAdvanceFromNominating("decided", 0)).toEqual({ ok: true });
    expect(canAdvanceFromNominating("cancelled", 0)).toEqual({ ok: true });
  });
});
