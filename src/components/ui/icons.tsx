import { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

// @spec COMP-ICONS-001..006 — every exported icon shares IconBase's contract
function IconBase({
  size = 16,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function BookIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </IconBase>
  );
}

export function VoteIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </IconBase>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 10h18" />
    </IconBase>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
    </IconBase>
  );
}

export function TrendIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </IconBase>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </IconBase>
  );
}

export function XIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </IconBase>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8" />
      <path d="M22 21a7 7 0 0 0-5-6.7" />
    </IconBase>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function EditIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 20h4l11-11-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </IconBase>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4h6v3" />
    </IconBase>
  );
}

export function ReplyIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M9 17l-5-5 5-5" />
      <path d="M4 12h10a6 6 0 0 1 6 6v2" />
    </IconBase>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M15 18l-6-6 6-6" />
    </IconBase>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M9 6l6 6-6 6" />
    </IconBase>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  );
}

export function FilterIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
    </IconBase>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <IconBase {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

// @spec COMP-ICONS-LOGO-001, COMP-ICONS-LOGO-002
// The Dogear brand mark: a terracotta rounded square with a folded top-right
// corner (the namesake gesture). Token-bridged colors via var() in fill/stroke
// (no literals); drawn as plain paths with no <clipPath>, so multiple instances
// on one page share no duplicate id. Geometry mirrors the handoff dogear-mark.svg.
export function LogoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* terracotta cloth base */}
      <rect x="2" y="2" width="60" height="60" rx="15" fill="var(--color-primary)" />
      {/* crease underside (darker terracotta), lower-left half of the fold */}
      <path d="M40 2 L62 24 L40 24 Z" fill="var(--color-primary-hover)" />
      {/* folded page (paper), upper-right half — top-right corner rounded to
          follow the card edge so no sharp nub pokes past the radius */}
      <path d="M40 2 L47 2 A15 15 0 0 1 62 17 L62 24 Z" fill="var(--color-bg)" />
      {/* crease line */}
      <path
        d="M40 2 L62 24"
        stroke="var(--color-primary-hover)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
