// @spec NAV-MOBILE-006 — single source of truth for club destinations, shared
// by the desktop sidebar and the mobile bottom tab bar so the two never drift.
import type { ComponentType } from "react";
import {
  BookIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  TrendIcon,
  UsersIcon,
} from "@/components/ui";

export type NavItem = {
  label: string;
  /** href suffix appended to /clubs/{clubId} */
  href: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "", icon: BookIcon, adminOnly: false },
  { label: "Voting", href: "/vote", icon: VoteIcon, adminOnly: false },
  { label: "Meetings", href: "/meetings", icon: CalendarIcon, adminOnly: false },
  { label: "Discussions", href: "/discussions", icon: ChatIcon, adminOnly: false },
  { label: "Progress", href: "/progress", icon: TrendIcon, adminOnly: false },
  { label: "Members", href: "/members", icon: UsersIcon, adminOnly: true },
  // @spec CLUB-UI-SETTINGS-001
  { label: "Settings", href: "/settings", icon: UsersIcon, adminOnly: true },
];

/** Labels rendered directly on the mobile tab bar; the rest live behind "More". */
export const PRIMARY_TAB_LABELS = [
  "Dashboard",
  "Voting",
  "Meetings",
  "Discussions",
] as const;

export function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "owner";
}

export function canSeeNavItem(item: NavItem, role: string | undefined): boolean {
  return !item.adminOnly || isAdminRole(role);
}
