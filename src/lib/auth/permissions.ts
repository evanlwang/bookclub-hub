// @spec CLUB-BE-002

export type Role = "owner" | "admin" | "member";

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/**
 * Check if a user's role meets or exceeds the required role.
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageMembers(role: Role): boolean {
  return hasRole(role, "admin");
}

export function canManageRounds(role: Role): boolean {
  return hasRole(role, "admin");
}

export function canManageMeetings(role: Role): boolean {
  return hasRole(role, "admin");
}

export function canEditClubSettings(role: Role): boolean {
  return hasRole(role, "admin");
}

export function canDeleteClub(role: Role): boolean {
  return hasRole(role, "owner");
}

export function canTransferOwnership(role: Role): boolean {
  return hasRole(role, "owner");
}
