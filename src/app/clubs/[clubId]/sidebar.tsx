// @spec DASH-UI-001, DASH-UI-002, AUTH-UI-LOGOUT-001, CLUB-NAV-MODAL-001, CLUB-NAV-MODAL-010
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
  Avatar,
  Badge,
} from "@/components/ui";
import { ClubSwitcherModal } from "@/components/club/club-switcher-modal";

const navItems = [
  { label: "Dashboard", href: "", icon: BookIcon },
  { label: "Voting", href: "/vote", icon: VoteIcon },
  { label: "Meetings", href: "/meetings", icon: CalendarIcon },
  { label: "Discussions", href: "/discussions", icon: ChatIcon },
  { label: "Progress", href: "/progress", icon: TrendIcon },
];

type ClubInfo = { id: string; name: string; code: string; role: string };

export function ClubSidebar({
  clubId,
  clubName,
  userName,
  clubs = [],
  hasActiveVote = false,
}: {
  clubId: string;
  clubName: string;
  userName: string;
  clubs?: ClubInfo[];
  hasActiveVote?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/clubs/${clubId}`;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [addClubModalOpen, setAddClubModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const currentClub = clubs.find((c) => c.id === clubId);

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
    <aside className="w-60 shrink-0 border-r border-line bg-bg-soft flex flex-col h-screen sticky top-0 hidden md:flex">
      {/* Club header / switcher */}
      <div className="p-4 border-b border-line relative">
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="flex items-center gap-2.5 w-full text-left"
        >
          <LogoIcon size={24} />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-ink truncate block">
              {clubName}
            </span>
            {currentClub && (
              <span className="text-[10px] text-ink-3 uppercase tracking-wider">
                {currentClub.role}
              </span>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-ink-3 transition-transform ${switcherOpen ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Club switcher dropdown */}
        {switcherOpen && clubs.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-bg border border-line rounded-[var(--radius-md)] shadow-lg z-50 py-1">
            {clubs.map((c) => (
              <Link
                key={c.id}
                href={`/clubs/${c.id}`}
                onClick={() => setSwitcherOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-sunken transition-colors ${c.id === clubId ? "font-medium text-ink" : "text-ink-2"}`}
              >
                <span className="truncate">{c.name}</span>
                <Badge tone="neutral">{c.role}</Badge>
              </Link>
            ))}
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
                Create or join a club
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
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);
          const Icon = item.icon;
          const showLiveBadge = item.label === "Voting" && hasActiveVote;
          return (
            <Link
              key={item.label}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-150 ${
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
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} size="sm" />
          <span className="flex-1 text-sm text-ink-2 truncate">{userName}</span>
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
