// @spec PROG-BE-001, PROG-BE-002, PROG-BE-003, PROG-BE-005, PROG-BE-006, PROG-BE-006-AUTOFINISH

export interface ProgressInput {
  currentPage?: number | null;
  totalPages?: number | null;
  percentage?: number | null;
  status?: "not_started" | "reading" | "finished";
}

export interface ProgressOutput {
  currentPage: number | null;
  totalPages: number | null;
  percentage: number;
  status: "not_started" | "reading" | "finished";
}

/**
 * Compute derived progress fields.
 * - If status is "finished", set percentage=100, currentPage=totalPages
 * - If currentPage provided + totalPages known: compute percentage
 * - If percentage provided + totalPages known: compute currentPage
 * - If totalPages unknown: accept percentage only, currentPage stays null
 */
export function computeProgress(input: ProgressInput): ProgressOutput {
  const { status = "reading", totalPages = null } = input;
  let { currentPage = null, percentage = null } = input;

  // "finished" overrides everything
  if (status === "finished") {
    return {
      currentPage: totalPages,
      totalPages,
      percentage: 100,
      status: "finished",
    };
  }

  // "not_started" zeros everything
  if (status === "not_started") {
    return {
      currentPage: null,
      totalPages,
      percentage: 0,
      status: "not_started",
    };
  }

  // Compute derived values
  if (currentPage != null && totalPages != null && totalPages > 0) {
    percentage = Math.round((currentPage / totalPages) * 100);
  } else if (percentage != null && totalPages != null && totalPages > 0) {
    currentPage = Math.round((percentage / 100) * totalPages);
  }

  // If totalPages unknown, only percentage is meaningful
  if (totalPages == null) {
    currentPage = null;
  }

  // Auto-promote to "finished" when the user has effectively read everything.
  // Requires a known totalPages — without a denominator, percentage=100 is a
  // user-supplied claim we leave alone (they can flip status manually).
  // @spec PROG-BE-006-AUTOFINISH
  if (status === "reading" && totalPages != null && percentage === 100) {
    return {
      currentPage: totalPages,
      totalPages,
      percentage: 100,
      status: "finished",
    };
  }

  return {
    currentPage,
    totalPages,
    percentage: percentage ?? 0,
    status,
  };
}
