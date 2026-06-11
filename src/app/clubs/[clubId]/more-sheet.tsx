// @spec NAV-MOBILE-004
"use client";

import Link from "next/link";
import { Avatar, Badge, Sheet } from "@/components/ui";
import { useSignOut } from "@/lib/hooks/use-sign-out";
import { navItems, canSeeNavItem, PRIMARY_TAB_SLUGS } from "./nav-items";

type ClubInfo = { id: string; name: string; code: string; role: string };

const PRIMARY = new Set<string>(PRIMARY_TAB_SLUGS);

/**
 * The mobile club menu (opened from the header): secondary admin pages
 * (Members/Settings), club switching + create/join, and sign-out. Primary
 * destinations live on the bottom tab bar; the invite code lives in the header.
 */
export function MoreSheet({
  open,
  onClose,
  onAddClub,
  clubId,
  userName,
  clubs,
  unreadDiscussionCounts = {},
}: {
  open: boolean;
  onClose: () => void;
  onAddClub: () => void;
  clubId: string;
  userName: string;
  clubs: ClubInfo[];
  unreadDiscussionCounts?: Record<string, number>;
}) {
  const basePath = `/clubs/${clubId}`;
  const currentClub = clubs.find((c) => c.id === clubId);
  const role = currentClub?.role;
  const { signOut, signingOut } = useSignOut();

  const secondary = navItems.filter(
    (item) => !PRIMARY.has(item.slug) && canSeeNavItem(item, role),
  );
  const otherClubs = clubs.filter((c) => c.id !== clubId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel="More navigation"
      testId="mobile-more-sheet"
      className="p-5"
    >
      {/* Current club identity */}
      <div className="flex items-center gap-2.5 mb-1">
        <span className="font-[var(--font-display)] text-lg font-semibold text-ink truncate">
          {currentClub?.name ?? "Club"}
        </span>
      </div>
      {role && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          <Badge
            tone={role === "owner" ? "primary" : role === "admin" ? "accent" : "neutral"}
          >
            {role}
          </Badge>
        </div>
      )}

      {/* Secondary destinations */}
      <nav className="space-y-0.5 mb-2">
        {secondary.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.slug}
              href={`${basePath}${item.href}`}
              onClick={onClose}
              data-testid={`more-nav-${item.slug}`}
              className="flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)] text-[15px] font-medium text-ink-2 active:bg-bg-sunken transition-colors"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Switch / add clubs */}
      <div className="border-t border-line pt-2 mb-2">
        {otherClubs.length > 0 && (
          <>
            <p className="px-3 pt-1 pb-1 text-[11px] uppercase tracking-wider text-ink-3">
              Switch club
            </p>
            {otherClubs.map((c) => {
              const unread = unreadDiscussionCounts[c.id] ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/clubs/${c.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--radius-md)] text-[15px] text-ink-2 active:bg-bg-sunken transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{c.name}</span>
                    {unread > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-label={`${unread} new`} />
                    )}
                  </span>
                  <Badge tone="neutral">{c.role}</Badge>
                </Link>
              );
            })}
          </>
        )}
        <button
          type="button"
          onClick={onAddClub}
          data-testid="more-add-club"
          className="w-full text-left px-3 py-3 rounded-[var(--radius-md)] text-[15px] font-medium text-primary active:bg-bg-sunken transition-colors"
        >
          + Create or join a club
        </button>
      </div>

      {/* User + sign out */}
      <div className="border-t border-line pt-3 flex items-center gap-2.5">
        <Avatar name={userName} size="sm" />
        <span className="flex-1 text-[15px] text-ink-2 truncate">{userName}</span>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="text-sm text-ink-3 active:text-ink transition-colors disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </Sheet>
  );
}
