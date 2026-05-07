import { describe, it, expect } from "vitest";
import { pickMostAvailableSlot, summarizeSlot } from "@/lib/meetings/availability";

type Slot = Parameters<typeof pickMostAvailableSlot>[0][number];

const slot = (
  id: string,
  proposedTime: string | Date,
  responses: Array<{ status: "available" | "maybe" | "unavailable" }>
): Slot => ({
  id,
  proposedTime,
  responses: responses.map((r, i) => ({
    userId: `u${i}`,
    status: r.status,
  })),
});

describe("pickMostAvailableSlot", () => {
  // @spec MEET-UI-CONFIRM-BADGE-001
  it("returns null when given no slots", () => {
    expect(pickMostAvailableSlot([])).toBeNull();
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  it("returns null when no slot has any responses", () => {
    const slots = [
      slot("a", "2026-06-01T18:00:00Z", []),
      slot("b", "2026-06-02T18:00:00Z", []),
    ];
    expect(pickMostAvailableSlot(slots)).toBeNull();
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  it("picks the slot with the highest available count", () => {
    const slots = [
      slot("a", "2026-06-01T18:00:00Z", [{ status: "available" }]),
      slot("b", "2026-06-02T18:00:00Z", [
        { status: "available" },
        { status: "available" },
      ]),
      slot("c", "2026-06-03T18:00:00Z", [{ status: "maybe" }]),
    ];
    expect(pickMostAvailableSlot(slots)?.id).toBe("b");
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  it("breaks ties on available count by available+maybe count", () => {
    const slots = [
      slot("a", "2026-06-01T18:00:00Z", [
        { status: "available" },
        { status: "maybe" },
      ]),
      slot("b", "2026-06-02T18:00:00Z", [{ status: "available" }]),
    ];
    // Both have 1 available; A also has 1 maybe → A wins.
    expect(pickMostAvailableSlot(slots)?.id).toBe("a");
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  it("breaks remaining ties by proposedTime ascending (earliest first)", () => {
    const slots = [
      slot("later", "2026-06-10T18:00:00Z", [{ status: "available" }]),
      slot("earlier", "2026-06-01T18:00:00Z", [{ status: "available" }]),
    ];
    expect(pickMostAvailableSlot(slots)?.id).toBe("earlier");
  });

  // @spec MEET-UI-CONFIRM-BADGE-001
  it("ignores unavailable-only slots when others have any availability", () => {
    const slots = [
      slot("a", "2026-06-01T18:00:00Z", [
        { status: "unavailable" },
        { status: "unavailable" },
      ]),
      slot("b", "2026-06-02T18:00:00Z", [{ status: "available" }]),
    ];
    expect(pickMostAvailableSlot(slots)?.id).toBe("b");
  });
});

describe("summarizeSlot", () => {
  it("counts each status independently", () => {
    const s = slot("a", "2026-06-01T18:00:00Z", [
      { status: "available" },
      { status: "available" },
      { status: "maybe" },
      { status: "unavailable" },
    ]);
    expect(summarizeSlot(s)).toEqual({
      slotId: "a",
      available: 2,
      maybe: 1,
      unavailable: 1,
    });
  });
});
