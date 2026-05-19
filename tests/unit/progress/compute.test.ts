// @spec PROG-BE-001, PROG-BE-002, PROG-BE-003, PROG-BE-005, PROG-BE-006, PROG-BE-006-AUTOFINISH
import { describe, it, expect } from "vitest";
import { computeProgress } from "@/lib/progress/compute";

describe("computeProgress", () => {
  describe("page → percentage", () => {
    it("computes percentage from page and totalPages", () => {
      const result = computeProgress({
        currentPage: 187,
        totalPages: 304,
        status: "reading",
      });
      expect(result.percentage).toBe(62); // round(187/304*100) = 61.5 -> 62
    });

    it("computes 0% for page 0", () => {
      const result = computeProgress({
        currentPage: 0,
        totalPages: 304,
        status: "reading",
      });
      expect(result.percentage).toBe(0);
    });

    it("computes 100% for last page", () => {
      const result = computeProgress({
        currentPage: 304,
        totalPages: 304,
        status: "reading",
      });
      expect(result.percentage).toBe(100);
    });
  });

  describe("percentage → page", () => {
    it("computes page from percentage and totalPages", () => {
      const result = computeProgress({
        percentage: 50,
        totalPages: 304,
        status: "reading",
      });
      expect(result.currentPage).toBe(152);
    });

    it("computes page 0 from 0%", () => {
      const result = computeProgress({
        percentage: 0,
        totalPages: 304,
        status: "reading",
      });
      expect(result.currentPage).toBe(0);
    });
  });

  describe("null totalPages", () => {
    it("accepts percentage only, currentPage stays null", () => {
      const result = computeProgress({
        percentage: 50,
        totalPages: null,
        status: "reading",
      });
      expect(result.percentage).toBe(50);
      expect(result.currentPage).toBeNull();
    });

    it("currentPage input ignored when totalPages is null", () => {
      const result = computeProgress({
        currentPage: 100,
        totalPages: null,
        status: "reading",
      });
      expect(result.currentPage).toBeNull();
    });
  });

  describe("status: finished", () => {
    it("sets percentage to 100", () => {
      const result = computeProgress({
        currentPage: 50,
        totalPages: 304,
        status: "finished",
      });
      expect(result.percentage).toBe(100);
    });

    it("sets currentPage to totalPages", () => {
      const result = computeProgress({
        currentPage: 50,
        totalPages: 304,
        status: "finished",
      });
      expect(result.currentPage).toBe(304);
    });

    it("handles null totalPages when finished", () => {
      const result = computeProgress({
        totalPages: null,
        status: "finished",
      });
      expect(result.percentage).toBe(100);
      expect(result.currentPage).toBeNull();
    });
  });

  // @spec PROG-BE-006-AUTOFINISH
  describe("auto-promote to finished at 100%", () => {
    it("flips status from reading to finished when currentPage equals totalPages", () => {
      const result = computeProgress({
        currentPage: 304,
        totalPages: 304,
        status: "reading",
      });
      expect(result.status).toBe("finished");
      expect(result.percentage).toBe(100);
      expect(result.currentPage).toBe(304);
    });

    it("flips status from reading to finished when percentage input is 100", () => {
      const result = computeProgress({
        percentage: 100,
        totalPages: 304,
        status: "reading",
      });
      expect(result.status).toBe("finished");
      expect(result.percentage).toBe(100);
      expect(result.currentPage).toBe(304);
    });

    it("does NOT auto-promote at 99%", () => {
      const result = computeProgress({
        currentPage: 301,
        totalPages: 304,
        status: "reading",
      });
      expect(result.status).toBe("reading");
      expect(result.percentage).toBe(99);
    });

    it("does NOT auto-promote when totalPages is null even with percentage=100 (no denominator → user-controlled)", () => {
      const result = computeProgress({
        percentage: 100,
        totalPages: null,
        status: "reading",
      });
      expect(result.status).toBe("reading");
      expect(result.percentage).toBe(100);
    });

    it("does not affect status=not_started (which forces percentage=0 anyway)", () => {
      const result = computeProgress({
        currentPage: 304,
        totalPages: 304,
        status: "not_started",
      });
      expect(result.status).toBe("not_started");
      expect(result.percentage).toBe(0);
    });
  });

  // @spec PROG-BE-001
  describe("boundary inputs", () => {
    it("returns percentage=100 when currentPage equals totalPages", () => {
      const result = computeProgress({
        currentPage: 412,
        totalPages: 412,
        status: "reading",
      });
      // PROG-BE-006-AUTOFINISH then flips status to finished.
      expect(result.percentage).toBe(100);
    });

    it("returns percentage=0 when currentPage is 0", () => {
      const result = computeProgress({
        currentPage: 0,
        totalPages: 412,
        status: "reading",
      });
      expect(result.percentage).toBe(0);
    });

    // Out-of-range currentPage values produce out-of-range percentages here —
    // input validation lives at the API boundary (`progress.update`), not in
    // this pure compute function. Documented so the server-side guard isn't
    // accidentally weakened later.
    // @spec PROG-API-VALID-001
    it("DOES NOT clamp currentPage > totalPages (server is responsible)", () => {
      const result = computeProgress({
        currentPage: 500,
        totalPages: 412,
        status: "reading",
      });
      expect(result.percentage).toBeGreaterThan(100);
    });
  });

  describe("status: not_started", () => {
    it("sets percentage to 0 and currentPage to null", () => {
      const result = computeProgress({
        currentPage: 50,
        totalPages: 304,
        status: "not_started",
      });
      expect(result.percentage).toBe(0);
      expect(result.currentPage).toBeNull();
    });
  });

  describe("defaults", () => {
    it("defaults to reading status", () => {
      const result = computeProgress({ percentage: 50, totalPages: 100 });
      expect(result.status).toBe("reading");
    });

    it("defaults percentage to 0 when nothing provided", () => {
      const result = computeProgress({});
      expect(result.percentage).toBe(0);
    });
  });
});
