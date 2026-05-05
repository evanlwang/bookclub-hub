// @spec PROG-BE-001, PROG-BE-002, PROG-BE-003, PROG-BE-005, PROG-BE-006
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
