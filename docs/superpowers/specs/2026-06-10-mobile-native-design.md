# Make Dogear feel mobile-native (responsive-polish tier)

## Context

Dogear is a desktop-first Next.js 16 / Tailwind v4 app. It renders well on
phones for *content* — most pages already reflow to a single column — but it is
not usable or app-like on mobile because:

- **There is no mobile navigation at all.** The club sidebar
  (`src/app/clubs/[clubId]/sidebar.tsx`) is `hidden md:flex`, so on a phone a
  member lands on a page with no way to reach Voting, Meetings, Discussions,
  Progress, the club switcher, or sign-out. This is the single blocking gap.
- A handful of dense layouts overflow horizontally on a ~375px screen (meetings
  availability heatmap, respond-meeting slot buttons, the members table, the
  voting results leaderboard).
- It lacks the small things that make a web app *feel* native: install/standalone
  capability, safe-area handling for notch/home-indicator, bottom-sheet overlays,
  touch-sized targets, and momentum/overscroll behavior.

The user chose the **responsive-polish** tier (stay a website, no app store) with
all three priorities — feel, reach, and layout density. Decisions locked:
**bottom tab bar** for mobile nav (overflow behind a "More" sheet),
**manifest-only** reach (installable / standalone; offline + push deferred), and
a **shared responsive Sheet primitive** (bottom sheet on phones, centered modal
on desktop).

Outcome: a member can open Dogear on their phone, install it to the home screen,
launch it full-screen, navigate everything from a thumb-reachable tab bar, and
never hit a cramped or horizontally-scrolling screen.

### LID note
This repo mandates linked-intent development (HLD → LLD → EARS → Tests → Code).
Each phase below adds/updates EARS specs in `docs/specs/` (new domains
`NAV-MOBILE-*`, `PWA-*`, plus density IDs under existing meet/vote/member specs),
drafts/updates the relevant LLD in `docs/llds/`, writes tests before code, and
adds `// @spec` annotations at each behavior's entry point. Stop for review
between phases per CLAUDE.md.

---

## Phase 0 — Foundations (viewport, safe-area, manifest)

Cheap, no visual risk, unblocks everything else.

- **Viewport + theme** in `src/app/layout.tsx`: add a Next.js `export const
  viewport` with `viewportFit: "cover"` and `themeColor` (derive from the warm
  `--color-bg` token). This is what lets `env(safe-area-inset-*)` resolve and
  removes the browser-chrome color mismatch.
- **Manifest** via a Next.js metadata route `src/app/manifest.ts` (typed
  `MetadataRoute.Manifest`). `display: "standalone"`, `name`/`short_name`
  "Dogear", `start_url: "/"`, background + theme colors from tokens, and the
  **already-present** icons in `public/icons/` (192/512) plus `public/icon.svg`.
  No new art needed.
- **Global mobile base** in `src/app/globals.css` (`@layer base`): add
  `-webkit-tap-highlight-color: transparent`, `-webkit-text-size-adjust: 100%`,
  and a `.safe-bottom` / `.safe-top` utility set built on `env(safe-area-inset-*)`
  for reuse by the tab bar and sheets.

Files: `src/app/layout.tsx`, new `src/app/manifest.ts`, `src/app/globals.css`.

---

## Phase 1 — Mobile bottom tab bar (the unblock)

- **Extract the nav config** out of `sidebar.tsx` into a shared module
  `src/app/clubs/[clubId]/nav-items.ts` (the existing `navItems` array + the
  admin-gating predicate) so the sidebar and the new tab bar share one source of
  truth. Sidebar imports from it — no behavior change to desktop.
- **New `MobileTabBar`** (client) — `src/app/clubs/[clubId]/mobile-tab-bar.tsx`.
  Fixed to the bottom, `md:hidden`, `safe-bottom` padding. 4 primary tabs
  (Dashboard, Vote, Meetings, Discussions) + a **More** tab. Each tab is icon +
  short label, thumb-sized (min 44px). Active state from `usePathname`. Carries
  the same badge signals the sidebar already receives (`hasActiveVote`,
  `hasUnrespondedMeeting`, `unreadDiscussionCounts`) as small dots.
- **New `MoreSheet`** — built on the Phase 2 Sheet. Holds what doesn't fit on the
  bar: Progress, admin-only Members/Settings, the **club switcher** + current
  club identity/code, and **sign-out**. Reuses the switcher/sign-out logic
  currently inside `sidebar.tsx` (extract those handlers so both share them).
- **Wire into layout** — `src/app/clubs/[clubId]/layout.tsx`: render
  `<MobileTabBar/>` (`md:hidden`) next to the existing `<ClubSidebar/>`
  (`hidden md:flex`), passing the same props the layout already computes. Add
  bottom padding to `<main>` on mobile so content clears the bar:
  `pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-[...existing]`.

Files: new `nav-items.ts`, new `mobile-tab-bar.tsx`, new `more-sheet.tsx`,
edit `sidebar.tsx` (import shared config/handlers), edit `layout.tsx`.

---

## Phase 2 — Responsive Sheet primitive + modal migration

- **New `src/components/ui/sheet.tsx`** — one overlay primitive:
  - Mobile (`<md`): bottom sheet — anchored bottom, full width, rounded top,
    drag handle, slide-up animation, `max-h-[90dvh]` with internal scroll,
    `safe-bottom` padding, swipe-down + backdrop-tap to dismiss.
  - Desktop (`md+`): centered card — the current look
    (`fixed inset-0 backdrop-blur flex items-center justify-center`).
  - Reuses the existing `useFocusTrap` hook + Escape handling and `createPortal`
    (both already used by `club-switcher-modal.tsx`). Add slide-up keyframes to
    `globals.css`.
- **Migrate the ad-hoc modals** (all currently hand-rolled with the same
  `fixed inset-0 backdrop-blur ... flex items-center justify-center` pattern) to
  `<Sheet>`: `club-switcher-modal.tsx`, `vote/nominate-modal.tsx`,
  `vote/close-voting-dialog.tsx`, `progress/update-modal.tsx`,
  `meetings/edit-meeting-dialog.tsx`, `meetings/cancel-meeting-dialog.tsx`, plus
  the new `MoreSheet`. Mostly delete boilerplate and wrap existing inner content.

Files: new `src/components/ui/sheet.tsx`, `src/components/ui/index.ts` export,
`globals.css` (keyframes), the 6 modal files above.

---

## Phase 3 — Density fixes (the horizontal-scroll offenders)

Pattern for each: keep the desktop layout, add a phone variant via
`hidden md:block` (desktop) + `md:hidden` (mobile card/stack).

- **Meetings availability heatmap** — `meetings/admin-confirm.tsx` (worst
  offender; a member×slot `<table>` that scrolls past ~5 slots). Mobile variant:
  a per-slot card list, each slot showing an avatar stack grouped by
  available / maybe / can't, instead of the matrix.
- **Respond-meeting slots** — `meetings/respond-meeting.tsx`: stack the three
  status buttons below the time on mobile (`flex-col sm:flex-row`) and make them
  full-width, touch-sized.
- **Members table** — `members/members-client.tsx`: `hidden md:table` for the
  4-column table; `md:hidden` card list (avatar + name/email, role badge, wrapped
  action buttons) for phones.
- **Voting results leaderboard** — `vote/decided-phase.tsx`: collapse the
  4-/5-column grid to a stacked row on mobile (`grid-cols-1` → restore at `md`).
- **Nominating cards** — `vote/nominating-phase.tsx`: stack the `lg` book cover
  above text on the narrowest screens (or drop to a smaller cover) so the title
  isn't squeezed into ~180px.

---

## Phase 4 — Touch & feel polish

- **Button touch targets** — `src/components/ui/button.tsx`: the `sm` size is
  30px (below the 44px minimum). Add a coarse-pointer floor
  (`@media (pointer: coarse)` min-height) rather than changing desktop density.
- **Auth headers** — `login/page.tsx` and `join/page.tsx` use inline
  `padding: "20px 32px"`; replace with responsive classes so they don't clip on
  small phones.
- **Native scroll feel** — `overscroll-behavior-y: contain` on sheets and
  scrollable lists; momentum scrolling already implied; tap-highlight handled in
  Phase 0.
- **Toast position** — `progress/update-modal.tsx` toast sits at `bottom-6`;
  lift it above the tab bar on mobile (`bottom-[calc(4rem+...)] md:bottom-6`).
- **Range slider** — enlarge the progress slider thumb touch target on mobile.

---

## Phase 5 — Verification

- **Playwright (mobile viewport)** — extend the existing e2e suite
  (`tests/e2e/`, 375×812 project): tab bar visible on mobile, every destination
  reachable, More sheet opens and exposes switcher/members/sign-out, a modal
  renders as a bottom sheet, and **no horizontal overflow**
  (`document.scrollingElement.scrollWidth <= innerWidth`) on dashboard, vote,
  meetings (incl. admin heatmap), discussions, members, progress.
- **Install/standalone** — Chrome DevTools → Application → Manifest shows valid,
  installable; Lighthouse PWA/installability passes; launch from home screen
  renders standalone with correct theme color and safe-area insets respected on
  a notched device (or iPhone simulator).
- **Manual sweep** — DevTools device mode (iPhone SE 375px + a notched model)
  across all club pages; confirm thumb-reach, no clipped headers, sheets dismiss
  by swipe/backdrop.
- **Regression** — `npm run lint`, `npm run typecheck`, `npm run test` (unit +
  integration) green; desktop layout unchanged (sidebar still `md:flex`).

---

## Sequencing & risk

Build order is Phase 0 → 2 → 1 → 3 → 4 → 5 (Sheet primitive lands before the
MoreSheet that depends on it; in the plan it reads 0→1→2 for narrative but the
Sheet is the dependency, so implement Phase 2's `sheet.tsx` before Phase 1's
`MoreSheet`). Each phase is independently shippable behind the `md` breakpoint —
desktop is untouched throughout, which bounds the blast radius. Highest-effort,
highest-payoff item is Phase 1 (nav); highest-fiddliness is the Phase 3 heatmap
reflow.

Work happens on a feature branch (`feature/mobile-native`) with a commit per
phase, PR into `main` — never a direct commit to `main`.
