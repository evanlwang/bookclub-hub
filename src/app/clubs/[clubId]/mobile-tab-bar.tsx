// @spec NAV-MOBILE-001, NAV-MOBILE-002, NAV-MOBILE-003
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/ui";
import { ClubSwitcherModal } from "@/components/club/club-switcher-modal";
import { navItems, PRIMARY_TAB_LABELS } from "./nav-items";
import { MoreSheet } from "./more-sheet";

type ClubInfo = { id: string; name: string; code: string; role: string };

/**
 * Fixed bottom tab bar shown only below `md`, where the sidebar is hidden. Four
 * primary destinations plus a "More" entry; activity signals mirror the
 * sidebar's. Renders nothing on `md+`.
 */
export function MobileTabBar({
  clubId,
  userName,
  clubs = [],
  hasActiveVote = false,
  hasUnrespondedMeeting = false,
  unreadDiscussionCounts = {},
}: {
  clubId: string;
  userName: string;
  clubs?: ClubInfo[];
  hasActiveVote?: boolean;
  hasUnrespondedMeeting?: boolean;
  /** @spec CLUB-NAV-UNREAD-001 */
  unreadDiscussionCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const basePath = `/clubs/${clubId}`;
  const [moreOpen, setMoreOpen] = useState(false);
  const [addClubOpen, setAddClubOpen] = useState(false);

  const primary = navItems.filter((i) =>
    (PRIMARY_TAB_LABELS as readonly string[]).includes(i.label),
  );
  const unreadForCurrent = unreadDiscussionCounts[clubId] ?? 0;
  const onSecondaryRoute =
    pathname.startsWith(`${basePath}/progress`) ||
    pathname.startsWith(`${basePath}/members`) ||
    pathname.startsWith(`${basePath}/settings`);

  return (
    <>
      <nav
        data-testid="mobile-tab-bar"
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-soft/95 backdrop-blur-md safe-bottom"
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ""
                ? pathname === basePath
                : pathname.startsWith(href);
            const Icon = item.icon;
            const showDot =
              (item.label === "Voting" && hasActiveVote) ||
              (item.label === "Meetings" && hasUnrespondedMeeting) ||
              (item.label === "Discussions" && unreadForCurrent > 0);
            return (
              <li key={item.label}>
                <Link
                  href={href}
                  data-testid={`mobile-tab-${item.label.toLowerCase()}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] px-1 text-[11px] font-medium transition-colors ${
                    isActive ? "text-primary" : "text-ink-3 active:text-ink-2"
                  }`}
                >
                  <span className="relative">
                    <Icon size={22} />
                    {showDot && (
                      <span
                        data-testid={`mobile-tab-${item.label.toLowerCase()}-dot`}
                        className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-bg-soft"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="leading-none">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              data-testid="mobile-tab-more"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] w-full px-1 text-[11px] font-medium transition-colors ${
                onSecondaryRoute ? "text-primary" : "text-ink-3 active:text-ink-2"
              }`}
            >
              <MenuIcon size={22} />
              <span className="leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onAddClub={() => {
          setMoreOpen(false);
          setAddClubOpen(true);
        }}
        clubId={clubId}
        userName={userName}
        clubs={clubs}
        unreadDiscussionCounts={unreadDiscussionCounts}
      />

      <ClubSwitcherModal
        isOpen={addClubOpen}
        onClose={() => setAddClubOpen(false)}
      />
    </>
  );
}
