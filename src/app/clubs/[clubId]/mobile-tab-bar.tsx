// @spec NAV-MOBILE-001, NAV-MOBILE-002, NAV-MOBILE-003, CLUB-NAV-BADGE-LIVE-001
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavState, type NavState } from "@/lib/hooks/use-nav-state";
import { navItems, PRIMARY_TAB_SLUGS } from "./nav-items";

// Cozy-redesign 2px outline tab icons, keyed by slug. Bookmark fills when active.
function TabIcon({ slug, active }: { slug: string; active: boolean }) {
  const c = active ? "var(--color-primary)" : "var(--color-ink-3)";
  const p = { width: 22, height: 22, viewBox: "0 0 22 22", fill: "none" } as const;
  switch (slug) {
    case "dashboard": // closed book, spine left
      return (
        <svg {...p}><rect x="4" y="3" width="14" height="16" rx="2.5" stroke={c} strokeWidth="2" /><line x1="8" y1="3.5" x2="8" y2="18.5" stroke={c} strokeWidth="2" /></svg>
      );
    case "voting": // check in circle
      return (
        <svg {...p}><circle cx="11" cy="11" r="8" stroke={c} strokeWidth="2" /><path d="M7.5 11.2l2.4 2.4 4.6-4.8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "meetings": // calendar
      return (
        <svg {...p}><rect x="3.5" y="5" width="15" height="13" rx="2.5" stroke={c} strokeWidth="2" /><line x1="3.5" y1="9.5" x2="18.5" y2="9.5" stroke={c} strokeWidth="2" /><line x1="7.5" y1="3" x2="7.5" y2="6.5" stroke={c} strokeWidth="2" strokeLinecap="round" /><line x1="14.5" y1="3" x2="14.5" y2="6.5" stroke={c} strokeWidth="2" strokeLinecap="round" /></svg>
      );
    case "discussions": // speech bubble
      return (
        <svg {...p}><path d="M4 5.5h14a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5H10l-4 3.5v-3.5H4A1.5 1.5 0 012.5 14V7A1.5 1.5 0 014 5.5z" stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>
      );
    case "progress": // bookmark ribbon (fills when active)
      return (
        <svg {...p}><path d="M6 3.5h10v15l-5-3.5-5 3.5v-15z" fill={active ? c : "none"} stroke={c} strokeWidth="2" strokeLinejoin="round" /></svg>
      );
    default:
      return null;
  }
}

/**
 * Fixed bottom tab bar shown only below `md`. Five primary destinations
 * (Nook, Voting, Meetings, Notes, Progress) with redesign outline icons,
 * a terracotta LIVE pill on Voting and an amber unread count on Notes.
 * Secondary destinations + sign-out live in the club-switcher header.
 */
export function MobileTabBar({
  clubId,
  initialNavState,
}: {
  clubId: string;
  /** @spec CLUB-NAV-UNREAD-001, CLUB-NAV-BADGE-LIVE-001 */
  initialNavState?: NavState;
}) {
  const pathname = usePathname();
  const { hasActiveVote, hasUnrespondedMeeting, unreadDiscussionCounts } =
    useNavState(clubId, initialNavState);
  const basePath = `/clubs/${clubId}`;
  const tabs = PRIMARY_TAB_SLUGS.map(
    (slug) => navItems.find((i) => i.slug === slug)!,
  );
  const unreadForCurrent = unreadDiscussionCounts[clubId] ?? 0;

  return (
    <nav
      data-testid="mobile-tab-bar"
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg-soft pt-2 px-1.5 safe-bottom shadow-[0_-4px_18px_-8px_oklch(0.45_0.05_60/0.18)]"
    >
      {tabs.map((item) => {
        const href = `${basePath}${item.href}`;
        const isActive =
          item.href === "" ? pathname === basePath : pathname.startsWith(href);
        const showLive = item.slug === "voting" && hasActiveVote;
        const showRespond = item.slug === "meetings" && hasUnrespondedMeeting;
        const showUnread = item.slug === "discussions" && unreadForCurrent > 0;
        return (
          <Link
            key={item.slug}
            href={href}
            data-testid={`mobile-tab-${item.slug}`}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-[3px] min-h-[48px] pb-1"
          >
            <span className="relative">
              <TabIcon slug={item.slug} active={isActive} />
              {showLive && (
                <span
                  data-testid="mobile-tab-voting-live"
                  className="absolute -top-1.5 -right-5 rounded-full bg-primary px-[5px] py-[1px] font-[var(--font-display)] font-extrabold text-[7.5px] tracking-[0.08em] text-bg"
                >
                  LIVE
                </span>
              )}
              {showRespond && (
                <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-warning ring-2 ring-bg-soft" aria-hidden="true" />
              )}
              {showUnread && (
                <span
                  data-testid="mobile-tab-discussions-unread"
                  className="absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-accent font-[var(--font-display)] font-extrabold text-[9.5px] text-ink"
                >
                  {unreadForCurrent}
                </span>
              )}
            </span>
            <span
              className={`font-[var(--font-display)] text-[10px] leading-none ${
                isActive ? "font-extrabold text-primary" : "font-bold text-ink-3"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
