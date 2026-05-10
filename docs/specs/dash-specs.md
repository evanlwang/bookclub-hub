# Dashboard and Navigation Specs

**LLD**: docs/llds/club-management.md
**Implementing artifacts**:
- UI: `src/app/clubs/[clubId]/page.tsx`, `src/app/clubs/[clubId]/sidebar.tsx`, `src/app/clubs/[clubId]/layout.tsx`
- Tests: `tests/e2e/attention-banner.spec.ts`, `tests/e2e/ui-interactions.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Dashboard State

State: club loaded — buttons shown: attention banner CTA (when applicable), per-card CTAs (vote/meet/discuss/progress) — transitions: route-level navigation
State: error — buttons shown: none — message: `error.message` displayed
State: empty (no current book) — buttons shown: "Start a vote" link — transitions: → `/clubs/{id}/vote`

## Sidebar Navigation

- `[x]` **DASH-UI-001**: The sidebar SHALL include a club switcher dropdown showing all clubs the user is a member of, with role Badges and a "Create or join a club" link at the bottom. (`sidebar.tsx:50-95`)
- `[x]` **DASH-UI-002**: The sidebar SHALL display a "Live" Badge (accent dot) on the Voting nav link when an active round exists. (`sidebar.tsx:107, 120-122`)
- `[ ]` **DASH-UI-NAV-UNREAD-001**: Unread count Badge on Discussions nav link when new threads exist since last visit. Not implemented.
- `[D]` **DASH-UI-003**: Topbar breadcrumb (`Club > Page`) deferred — the v1 layout uses a sidebar-only chrome; introducing a topbar is a layout-language change out of scope. The copyable invite-code chip half of this spec is satisfied by `DASH-UI-HEAD-COPY-001` rendered in the per-page header (`CopyClubCode`).
- `[D]` **DASH-UI-004**: Topbar "Invite" button deferred — same reason as `DASH-UI-003`. The invite-copy purpose is served by the inline Copy button on `CopyClubCode`.

## Attention Banner

- `[x]` **DASH-UI-005**: The attention banner SHALL display when the user has unvoted active rounds OR unresponded meeting proposals, showing action items with colored dot indicators. (`page.tsx:111-158`)
- `[x]` **DASH-UI-006**: The banner header SHALL read "1 thing needs your attention" or "2 things need your attention" depending on count. (`page.tsx:128-132`)
- `[x]` **DASH-UI-BANNER-VOTE-001**: When `hasNotVoted` is true (active round in voting status AND user has 0 votes), the banner SHALL show "Voting is open — you haven't voted yet" with a primary-colored dot. (`page.tsx:42-46, 134-139`)
- `[x]` **DASH-UI-BANNER-MEET-001**: When `hasPendingMeeting` is true (any proposed meeting where the user has no responses across any slot), the banner SHALL show "Meeting awaits your availability" with an accent-colored dot. (`page.tsx:50-60, 140-145`)
- `[x]` **DASH-UI-BANNER-CTA-VOTE-001**: When `hasNotVoted`, a "Cast my vote" Link CTA routes to `/clubs/{clubId}/vote`. (`page.tsx:148-155`)
- `[x]` **DASH-UI-BANNER-CTA-MEET-001**: When `hasPendingMeeting` is true, the attention banner SHALL render a "Respond to meetings" CTA (`data-testid="banner-cta-meet"`) linking to `/clubs/{clubId}/meetings`. When the user is *also* missing a vote, the meet CTA renders as a secondary outline button beside the primary "Cast my vote" CTA. (`src/app/clubs/[clubId]/page.tsx`)

## Currently Reading Hero

- `[x]` **DASH-UI-007**: The hero card SHALL show book cover, title, author. (`page.tsx:161-218`)
- `[x]` **DASH-UI-009**: The hero SHALL display three stats: median % (with "median" label), finished count, reading count. (`page.tsx:182-191`)
- `[x]` **DASH-UI-HERO-PROGRESS-001**: A primary progress bar SHALL render at median % (`page.tsx:195`). Below it, an avatar overlay row positions up to 8 member avatars at their progress percentage along the same horizontal axis. (`page.tsx:196-206`)
- `[!]` **DASH-UI-008**: Older spec required hoverable per-member tick-marks revealing tooltips with name + current chapter. **Today the avatars are positioned but neither connected to the progress bar fill (they sit on a separate `h-6` row below) nor wired to a tooltip on hover.** Treat as gap:
  - `[ ]` **DASH-UI-HERO-TICKS-001**: Tick-mark style overlay on the progress bar itself (not just below).
  - `[ ]` **DASH-UI-HERO-TOOLTIP-001**: Hover/focus tooltips on member tick-marks showing name and current chapter.
- `[x]` **DASH-UI-HERO-EMPTY-001**: When no book is selected, the hero card SHALL show "No book selected yet" with a "Start a vote" link. (`page.tsx:219-229`)

## Three-Column Grid Cards

- `[x]` **DASH-UI-010**: Below the hero, three preview cards SHALL render: Active Vote / Next Meeting / Recent Discussions. (`page.tsx:232-345`)
- `[x]` **DASH-UI-CARD-VOTE-001**: Active Vote card — when `activeRound` exists, displays the status as a Badge ("nominating" → accent, "voting" → primary) and a "Cast my vote" link. When no active round, shows "No active vote" + "Start a vote" link. (`page.tsx:234-266`)
- `[x]` **DASH-UI-CARD-MEET-001**: Next Meeting card — when `nextMeeting` exists, shows title + status Badge ("Confirmed" / "Awaiting responses") + confirmedTime (if any) + "View meetings" link. When none, shows "No meetings scheduled" + "Schedule a meeting" link. (`page.tsx:269-310`)
- `[x]` **DASH-UI-CARD-DISC-001**: Recent Discussions card — lists up to 3 most recent threads (chapter chip + title + comment count) plus a "View all" link. When empty, shows "No discussions yet" + "View all" link. (`page.tsx:313-344`)

## Reading Progress Link Card

- `[x]` **DASH-UI-PROG-001**: Below the three-up grid, a card SHALL show "Reading Progress" header and a "View progress" link to `/clubs/{clubId}/progress`. (`page.tsx:347-359`)

## Club Header

- `[x]` **DASH-UI-HEAD-001**: The header SHALL display the club name (h1, display serif, 3xl) and "Code: {CODE}" in monospace. (`page.tsx:97-108`)
- `[x]` **DASH-UI-011**: Invite code is rendered as a copyable chip with a Copy button. Implementation covered by sub-ID below.
  - `[x]` **DASH-UI-HEAD-COPY-001**: The dashboard header SHALL render the club code via the `CopyClubCode` component — `data-testid="club-code"` wraps "Code: {CODE}" with a "Copy" button that writes `code` to the clipboard, swaps to a "Copied" check for 1.5s, and emits `data-testid="copy-club-code-btn"` with `aria-label`. (`src/app/clubs/[clubId]/copy-club-code.tsx`, used in `src/app/clubs/[clubId]/page.tsx:112`)

## Deferred

- `[D]` **DASH-UI-NOTIF-001**: Notification bell with unread count badge.
- `[D]` **DASH-UI-THEME-001**: Theme switching (light/dark) in user menu.
