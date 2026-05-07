// @spec MEET-UI-CONFIRM-BADGE-001

export type ResponseStatus = "available" | "maybe" | "unavailable";

export type SlotResponse = {
  userId: string;
  status: ResponseStatus;
};

export type SlotForRanking = {
  id: string;
  proposedTime: Date | string;
  responses: SlotResponse[];
};

export type SlotSummary = {
  slotId: string;
  available: number;
  maybe: number;
  unavailable: number;
};

export function summarizeSlot(slot: SlotForRanking): SlotSummary {
  let available = 0;
  let maybe = 0;
  let unavailable = 0;
  for (const r of slot.responses) {
    if (r.status === "available") available++;
    else if (r.status === "maybe") maybe++;
    else if (r.status === "unavailable") unavailable++;
  }
  return { slotId: slot.id, available, maybe, unavailable };
}

/**
 * Picks the slot most likely to work for the group:
 *   1. Highest `available` count
 *   2. Tie-break: highest `available + maybe`
 *   3. Tie-break: earliest `proposedTime`
 *
 * Returns null if no slot has any responses at all (no signal to rank on).
 */
export function pickMostAvailableSlot<T extends SlotForRanking>(
  slots: T[]
): T | null {
  if (slots.length === 0) return null;
  const anyResponses = slots.some((s) => s.responses.length > 0);
  if (!anyResponses) return null;

  const ranked = [...slots].sort((a, b) => {
    const sa = summarizeSlot(a);
    const sb = summarizeSlot(b);
    if (sb.available !== sa.available) return sb.available - sa.available;
    const aSoft = sa.available + sa.maybe;
    const bSoft = sb.available + sb.maybe;
    if (bSoft !== aSoft) return bSoft - aSoft;
    return new Date(a.proposedTime).getTime() - new Date(b.proposedTime).getTime();
  });

  return ranked[0];
}
