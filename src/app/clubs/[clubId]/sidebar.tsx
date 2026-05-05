"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogoIcon,
  BookIcon,
  VoteIcon,
  CalendarIcon,
  ChatIcon,
  TrendIcon,
  Avatar,
} from "@/components/ui";

const navItems = [
  { label: "Dashboard", href: "", icon: BookIcon },
  { label: "Voting", href: "/vote", icon: VoteIcon },
  { label: "Meetings", href: "/meetings", icon: CalendarIcon },
  { label: "Discussions", href: "/discussions", icon: ChatIcon },
  { label: "Progress", href: "/progress", icon: TrendIcon },
];

export function ClubSidebar({
  clubId,
  clubName,
  userName,
}: {
  clubId: string;
  clubName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const basePath = `/clubs/${clubId}`;

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-bg-soft flex flex-col h-screen sticky top-0 hidden md:flex">
      {/* Club header */}
      <div className="p-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={24} />
          <span className="font-medium text-sm text-ink truncate">
            {clubName}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);
          const Icon = item.icon;
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
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-line">
        <div className="flex items-center gap-2.5">
          <Avatar name={userName} size="sm" />
          <span className="text-sm text-ink-2 truncate">{userName}</span>
        </div>
      </div>
    </aside>
  );
}
