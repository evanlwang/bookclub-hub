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
  /** Stable identifier — drives test ids, decoupled from the display label. */
  slug: string;
  /** Display label (cozy redesign vocabulary: "Nook", "Notes"). */
  label: string;
  /** href suffix appended to /clubs/{clubId} */
  href: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly: boolean;
};

export const navItems: NavItem[] = [
  { slug: "dashboard", label: "Nook", href: "", icon: BookIcon, adminOnly: false },
  { slug: "voting", label: "Voting", href: "/vote", icon: VoteIcon, adminOnly: false },
  { slug: "meetings", label: "Meetings", href: "/meetings", icon: CalendarIcon, adminOnly: false },
  { slug: "discussions", label: "Notes", href: "/discussions", icon: ChatIcon, adminOnly: false },
  { slug: "progress", label: "Progress", href: "/progress", icon: TrendIcon, adminOnly: false },
  { slug: "members", label: "Members", href: "/members", icon: UsersIcon, adminOnly: true },
  // @spec CLUB-UI-SETTINGS-001
  { slug: "settings", label: "Settings", href: "/settings", icon: UsersIcon, adminOnly: true },
];

/** Slugs rendered directly on the mobile bottom tab bar (the 5 primary
 *  destinations). Admin items live in the club-switcher header menu instead. */
export const PRIMARY_TAB_SLUGS = [
  "dashboard",
  "voting",
  "meetings",
  "discussions",
  "progress",
] as const;

export function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "owner";
}

export function canSeeNavItem(item: NavItem, role: string | undefined): boolean {
  return !item.adminOnly || isAdminRole(role);
}
