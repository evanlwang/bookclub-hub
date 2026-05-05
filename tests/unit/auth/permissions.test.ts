// @spec CLUB-BE-002, CLUB-DATA-003
import { describe, it, expect } from "vitest";
import {
  hasRole,
  canManageMembers,
  canManageRounds,
  canManageMeetings,
  canEditClubSettings,
  canDeleteClub,
  canTransferOwnership,
} from "@/lib/auth/permissions";

describe("hasRole", () => {
  it("owner meets owner requirement", () => {
    expect(hasRole("owner", "owner")).toBe(true);
  });

  it("owner meets admin requirement", () => {
    expect(hasRole("owner", "admin")).toBe(true);
  });

  it("owner meets member requirement", () => {
    expect(hasRole("owner", "member")).toBe(true);
  });

  it("admin meets admin requirement", () => {
    expect(hasRole("admin", "admin")).toBe(true);
  });

  it("admin meets member requirement", () => {
    expect(hasRole("admin", "member")).toBe(true);
  });

  it("admin does NOT meet owner requirement", () => {
    expect(hasRole("admin", "owner")).toBe(false);
  });

  it("member meets member requirement", () => {
    expect(hasRole("member", "member")).toBe(true);
  });

  it("member does NOT meet admin requirement", () => {
    expect(hasRole("member", "admin")).toBe(false);
  });

  it("member does NOT meet owner requirement", () => {
    expect(hasRole("member", "owner")).toBe(false);
  });
});

describe("permission helpers", () => {
  it("owner can manage members", () => {
    expect(canManageMembers("owner")).toBe(true);
  });

  it("admin can manage members", () => {
    expect(canManageMembers("admin")).toBe(true);
  });

  it("member cannot manage members", () => {
    expect(canManageMembers("member")).toBe(false);
  });

  it("admin can manage rounds", () => {
    expect(canManageRounds("admin")).toBe(true);
  });

  it("member cannot manage rounds", () => {
    expect(canManageRounds("member")).toBe(false);
  });

  it("admin can manage meetings", () => {
    expect(canManageMeetings("admin")).toBe(true);
  });

  it("admin can edit club settings", () => {
    expect(canEditClubSettings("admin")).toBe(true);
  });

  it("member cannot edit club settings", () => {
    expect(canEditClubSettings("member")).toBe(false);
  });

  it("owner can delete club", () => {
    expect(canDeleteClub("owner")).toBe(true);
  });

  it("admin cannot delete club", () => {
    expect(canDeleteClub("admin")).toBe(false);
  });

  it("owner can transfer ownership", () => {
    expect(canTransferOwnership("owner")).toBe(true);
  });

  it("admin cannot transfer ownership", () => {
    expect(canTransferOwnership("admin")).toBe(false);
  });
});
