// @spec NAV-MOBILE-HEADER-001, NAV-MOBILE-004, CLUB-NAV-BADGE-LIVE-001
"use client";

import { useState } from "react";
import { LogoIcon, Badge, ChevronDownIcon } from "@/components/ui";
import { ClubSwitcherModal } from "@/components/club/club-switcher-modal";
import { useNavState, type NavState } from "@/lib/hooks/use-nav-state";
import { MoreSheet } from "./more-sheet";

type ClubInfo = { id: string; name: string; code: string; role: string };

/**
 * Mobile-only sticky top header (the cozy redesign's "club switcher" bar). Hosts
 * the Dogear glyph + current club name/role and opens the club menu (switch
 * clubs, admin Members/Settings, create/join, sign-out). A dashed mono chip
 * copies the invite code. Replaces the dropped "More" tab on the bottom bar.
 */
export function MobileClubHeader({
  clubId,
  clubName,
  userName,
  clubs = [],
  initialNavState,
}: {
  clubId: string;
  clubName: string;
  userName: string;
  clubs?: ClubInfo[];
  /** @spec CLUB-NAV-UNREAD-001, CLUB-NAV-BADGE-LIVE-001 */
  initialNavState?: NavState;
}) {
  const { unreadDiscussionCounts } = useNavState(clubId, initialNavState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const currentClub = clubs.find((c) => c.id === clubId);
  const role = currentClub?.role;

  async function copyCode() {
    if (!currentClub?.code) return;
    try {
      await navigator.clipboard.writeText(currentClub.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // Clipboard write fails outside secure contexts; silently no-op.
    }
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-bg/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            data-testid="mobile-club-switcher"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 min-h-[44px] min-w-0"
          >
            <LogoIcon size={22} />
            <span className="font-[var(--font-display)] font-extrabold text-[19px] text-ink truncate max-w-[44vw]">
              {clubName}
            </span>
            {role && (
              <Badge tone={role === "owner" ? "primary" : role === "admin" ? "accent" : "neutral"}>
                {role}
              </Badge>
            )}
            <ChevronDownIcon size={14} />
          </button>

          {currentClub?.code && (
            <button
              type="button"
              onClick={copyCode}
              data-testid="mobile-copy-code"
              aria-label={codeCopied ? "Invite code copied" : "Copy invite code"}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-[10px] border-[1.5px] border-dashed border-ink-3 bg-bg-soft px-2.5 py-1.5 font-[var(--font-mono)] text-xs text-ink-2"
            >
              <span className="tracking-[0.04em]">{currentClub.code}</span>
              <span
                className={`font-[var(--font-display)] font-extrabold text-[11px] ${
                  codeCopied ? "text-success" : "text-primary"
                }`}
              >
                {codeCopied ? "✓" : "Copy"}
              </span>
            </button>
          )}
        </div>
      </header>

      <MoreSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddClub={() => {
          setMenuOpen(false);
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
