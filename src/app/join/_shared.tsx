"use client";

import { CheckIcon, ChevronRightIcon } from "@/components/ui";

export const paperBg =
  "radial-gradient(circle at 20% 10%, oklch(0.97 0.012 75) 0, transparent 50%), radial-gradient(circle at 80% 90%, oklch(0.96 0.018 30) 0, transparent 55%), var(--color-bg)";

export function LookupSpinner() {
  return (
    <svg
      data-testid="lookup-spinner"
      className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        fill="currentColor"
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function ClubFoundPanel({ clubInfo }: { clubInfo: { name: string; memberCount: number } }) {
  return (
    <div
      data-testid="club-found-panel"
      className="flex items-center gap-3 p-3.5 rounded-[var(--radius-md)] bg-primary-soft border animate-fade-in"
      style={{ borderColor: "var(--color-primary-line)" }}
    >
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary text-bg flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-primary-ink">{clubInfo.name}</p>
        <p className="text-xs text-primary-ink/75">
          {clubInfo.memberCount} member{clubInfo.memberCount !== 1 ? "s" : ""}
        </p>
      </div>
      <CheckIcon size={18} />
    </div>
  );
}

export function ErrorBox({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="p-3 rounded-[var(--radius-md)] bg-danger-soft text-danger text-[13px] border animate-fade-in"
      style={{ borderColor: "var(--color-danger-line)" }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PathCard({
  icon,
  title,
  body,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex gap-4 p-5 border border-line rounded-[var(--radius-lg)] bg-bg hover:bg-bg-soft hover:border-line-strong transition-all duration-150 cursor-pointer text-left"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-[var(--radius-md)] bg-primary-soft text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-ink text-[15px] mb-1">{title}</h3>
        <p className="text-ink-2 text-[13px] mb-2 leading-relaxed">{body}</p>
        <p className="text-ink-3 text-[12px] font-[var(--font-mono)]">{meta}</p>
      </div>
      <ChevronRightIcon size={16} className="flex-shrink-0 text-ink-3 mt-1" />
    </button>
  );
}
