// @spec DASH-UI-001, DASH-UI-002, AUTH-UI-LOGOUT-001, CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-010, CLUB-NAV-MEMBERS-001
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogoIcon,
  BookIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  TrendIcon,
  UsersIcon,
  Avatar,
  Badge,
} from "@/components/ui";
import { ClubSwitcherModal } from "@/components/club/club-switcher-modal";

const navItems = [
  { label: "Dashboard", href: "", icon: BookIcon, adminOnly: false },
  { label: "Voting", href: "/vote", icon: VoteIcon, adminOnly: false },
  { label: "Meetings", href: "/meetings", icon: CalendarIcon, adminOnly: false },
  { label: "Discussions", href: "/discussions", icon: ChatIcon, adminOnly: false },
  { label: "Progress", href: "/progress", icon: TrendIcon, adminOnly: false },
  { label: "Members", href: "/members", icon: UsersIcon, adminOnly: true },
  // @spec CLUB-UI-SETTINGS-001
  { label: "Settings", href: "/settings", icon: UsersIcon, adminOnly: true },
];

type ClubInfo = { id: string; name: string; code: string; role: string };

export function ClubSidebar({
  clubId,
  clubName,
  userName,
  clubs = [],
  hasActiveVote = false,
  hasUnrespondedMeeting = false,
  unreadDiscussionCounts = {},
}: {
  clubId: string;
  clubName: string;
  userName: string;
  clubs?: ClubInfo[];
  hasActiveVote?: boolean;
  hasUnrespondedMeeting?: boolean;
  /** @spec CLUB-NAV-UNREAD-001, DASH-UI-NAV-UNREAD-001 */
  unreadDiscussionCounts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/clubs/${clubId}`;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [addClubModalOpen, setAddClubModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const currentClub = clubs.find((c) => c.id === clubId);
  const hasMultipleClubs = clubs.length > 1;
  const [codeCopied, setCodeCopied] = useState(false);

  async function handleCopyCode(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentClub?.code) return;
    try {
      await navigator.clipboard.writeText(currentClub.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // Clipboard write fails outside secure contexts; silently no-op.
    }
  }

  function CodeChip() {
    if (!currentClub?.code) return null;
    return (
      <button
        type="button"
        onClick={handleCopyCode}
        data-testid="sidebar-copy-code"
        aria-label={codeCopied ? "Invite code copied" : "Copy invite code"}
        title={codeCopied ? "Copied" : "Copy invite code"}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-sunken hover:bg-line text-[clamp(11px,0.15vw+9px,13px)] font-[var(--font-mono)] text-ink-2 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="tracking-[0.04em]">{currentClub.code}</span>
        {codeCopied ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    );
  }

  function RoleBadge() {
    if (!currentClub?.role) return null;
    const tone =
      currentClub.role === "owner"
        ? "primary"
        : currentClub.role === "admin"
          ? "accent"
          : "neutral";
    return <Badge tone={tone}>{currentClub.role}</Badge>;
  }

  function MetaRow() {
    if (!currentClub) return null;
    return (
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <RoleBadge />
        <CodeChip />
      </div>
    );
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/trpc/auth.logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // Server emits the clearing Set-Cookie; we still wipe locally as a backup.
    }
    document.cookie = "session_id=; Path=/; Max-Age=0; SameSite=Lax";
    router.push("/");
  }

  return (
    <aside className="w-[clamp(240px,18vw,360px)] shrink-0 border-r border-line bg-bg-soft flex flex-col h-screen sticky top-0 hidden md:flex">
      {/* Club header / switcher */}
      <div className="p-4 border-b border-line relative">
        {hasMultipleClubs ? (
          <button
            type="button"
            onClick={() => setSwitcherOpen(!switcherOpen)}
            data-testid="sidebar-club-switcher"
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            className={`flex items-center gap-2.5 w-full text-left rounded-[var(--radius-md)] border px-2 py-1.5 -mx-2 -my-1.5 transition-colors ${
              switcherOpen
                ? "bg-bg border-line-strong"
                : "bg-bg border-line hover:bg-bg hover:border-line-strong"
            }`}
          >
            <LogoIcon size={24} />
            <div className="flex-1 min-w-0">
              <span className="font-[var(--font-display)] font-semibold text-[clamp(15px,0.4vw+9px,18px)] text-ink truncate block leading-tight">
                {clubName}
              </span>
              <span className="text-[clamp(11px,0.15vw+9px,13px)] text-ink-3">
                {clubs.length} {clubs.length === 1 ? "club" : "clubs"}
              </span>
            </div>
            <span className="flex items-center justify-center w-5 h-5 rounded-[var(--radius-sm)] bg-bg-sunken text-ink-2 shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${switcherOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
        ) : null}

        {hasMultipleClubs && <MetaRow />}

        {!hasMultipleClubs && (
          <div className="flex items-center gap-2.5">
            <LogoIcon size={24} />
            <div className="flex-1 min-w-0">
              <span className="font-[var(--font-display)] font-semibold text-[clamp(15px,0.4vw+9px,18px)] text-ink truncate block leading-tight">
                {clubName}
              </span>
              <MetaRow />
            </div>
            <button
              type="button"
              onClick={() => setAddClubModalOpen(true)}
              data-testid="sidebar-add-club-icon"
              aria-label="Create or join a club"
              title="Create or join a club"
              className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-bg-sunken transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        )}

        {/* Club switcher dropdown */}
        {hasMultipleClubs && switcherOpen && (
          <div
            role="listbox"
            className="absolute left-3 right-3 top-full mt-2 bg-bg border border-line rounded-[var(--radius-md)] shadow-lg z-50 py-1"
          >
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ink-3">
              Switch club
            </div>
            {clubs.map((c) => {
              const isCurrent = c.id === clubId;
              // @spec CLUB-NAV-UNREAD-001
              const unread = unreadDiscussionCounts[c.id] ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/clubs/${c.id}`}
                  onClick={() => setSwitcherOpen(false)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-bg-sunken transition-colors ${isCurrent ? "font-medium text-ink bg-bg-sunken" : "text-ink-2"}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isCurrent && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary shrink-0">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    )}
                    <span className={`truncate ${isCurrent ? "" : "ml-[20px]"}`}>{c.name}</span>
                    {!isCurrent && unread > 0 && (
                      <span
                        data-testid={`switcher-unread-${c.id}`}
                        className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                        aria-label={`${unread} new discussion${unread === 1 ? "" : "s"}`}
                      />
                    )}
                  </span>
                  <Badge tone="neutral">{c.role}</Badge>
                </Link>
              );
            })}
            <div className="border-t border-line mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSwitcherOpen(false);
                  setAddClubModalOpen(true);
                }}
                data-testid="sidebar-add-club"
                className="block w-full text-left px-3 py-2 text-sm text-primary hover:bg-bg-sunken transition-colors"
              >
                + Create or join a club
              </button>
            </div>
          </div>
        )}
      </div>

      <ClubSwitcherModal
        isOpen={addClubModalOpen}
        onClose={() => setAddClubModalOpen(false)}
      />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          if (item.adminOnly && currentClub?.role !== "admin" && currentClub?.role !== "owner") {
            return null;
          }
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);
          const Icon = item.icon;
          const showLiveBadge = item.label === "Voting" && hasActiveVote;
          const showRespondBadge =
            item.label === "Meetings" && hasUnrespondedMeeting;
          // @spec DASH-UI-NAV-UNREAD-001
          const unreadDiscussionsForCurrent =
            (unreadDiscussionCounts[clubId] ?? 0) > 0;
          const showDiscussionsUnread =
            item.label === "Discussions" && unreadDiscussionsForCurrent;
          return (
            <Link
              key={item.label}
              href={href}
              data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-[clamp(14px,0.3vw+10px,16px)] font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-primary-soft text-primary-ink"
                  : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              }`}
            >
              <Icon size={16} />
              {item.label}
              {showLiveBadge && (
                <Badge tone="accent" dot>Live</Badge>
              )}
              {showRespondBadge && (
                <span data-testid="sidebar-meetings-badge">
                  <Badge tone="warning" dot>Respond</Badge>
                </span>
              )}
              {showDiscussionsUnread && (
                <span data-testid="sidebar-discussions-unread">
                  <Badge tone="accent" dot>
                    {unreadDiscussionCounts[clubId]}
                  </Badge>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} size="sm" />
          <span className="flex-1 text-[clamp(14px,0.3vw+10px,16px)] text-ink-2 truncate">{userName}</span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-ink-3 hover:text-ink transition-colors disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
