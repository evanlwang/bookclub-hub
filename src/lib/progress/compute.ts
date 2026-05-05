// @spec PROG-BE-001, PROG-BE-002, PROG-BE-003, PROG-BE-005, PROG-BE-006

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
  const { status = "reading" } = input;
  let { currentPage = null, totalPages = null, percentage = null } = input;

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

  return {
    currentPage,
    totalPages,
    percentage: percentage ?? 0,
    status,
  };
}
