# Mobile-Native Experience Specs

**LLD**: docs/llds/mobile-experience.md
**Implementing artifacts**:
- Config: `src/app/layout.tsx` (viewport), `src/app/manifest.ts` (web manifest), `src/app/globals.css` (safe-area utilities, sheet animation)
- UI: `src/app/clubs/[clubId]/mobile-tab-bar.tsx`, `src/app/clubs/[clubId]/more-sheet.tsx`, `src/app/clubs/[clubId]/nav-items.ts`, `src/components/ui/sheet.tsx`
- Density: `src/app/clubs/[clubId]/meetings/admin-confirm.tsx`, `respond-meeting.tsx`, `src/app/clubs/[clubId]/members/members-client.tsx`, `src/app/clubs/[clubId]/vote/decided-phase.tsx`, `nominating-phase.tsx`
- Tests: `tests/e2e/mobile-navigation.spec.ts`, `tests/unit/app/manifest.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Install & Standalone (PWA, manifest-only tier)

- `[x]` **PWA-MANIFEST-001**: The system SHALL serve a web app manifest declaring `name` "Dogear", a `short_name`, `display: "standalone"`, `start_url: "/"`, and theme/background colors drawn from the app palette, so the app is installable to the home screen and launches without browser chrome. (`src/app/manifest.ts`)
- `[x]` **PWA-MANIFEST-002**: The manifest SHALL reference the existing icon assets at 192px and 512px (`public/icons/`) plus the SVG icon, so the installed app shows a correct home-screen icon. (`src/app/manifest.ts`)
- `[x]` **PWA-VIEWPORT-001**: The root document SHALL set `viewport-fit: cover` and a `themeColor`, so the layout can extend under the notch/home indicator and `env(safe-area-inset-*)` resolves to nonzero on notched devices. (`src/app/layout.tsx`)
- `[D]` **PWA-OFFLINE-001**: Offline app-shell caching via service worker — deferred (out of responsive-polish tier).
- `[D]` **PWA-PUSH-001**: Web push notifications — deferred.

## Safe-area & global touch base

- `[x]` **MOBILE-BASE-001**: Global styles SHALL disable the tap-highlight flash (`-webkit-tap-highlight-color: transparent`) and lock text auto-sizing (`-webkit-text-size-adjust: 100%`) so touch interactions feel native. (`src/app/globals.css`)
- `[x]` **MOBILE-BASE-002**: The system SHALL provide reusable `safe-bottom` / `safe-top` helpers built on `env(safe-area-inset-*)` for fixed bottom/top chrome. (`src/app/globals.css`)

## Mobile navigation (bottom tab bar)

- `[x]` **NAV-MOBILE-001**: On viewports below `md`, the system SHALL present a fixed bottom tab bar (hidden at `md+`) exposing the primary destinations Dashboard, Voting, Meetings, Discussions, plus a "More" entry, so club navigation is reachable on phones where the sidebar is hidden. (`src/app/clubs/[clubId]/mobile-tab-bar.tsx`)
- `[x]` **NAV-MOBILE-002**: Each tab SHALL present a thumb-sized (≥44px) touch target and reflect the active route. (`src/app/clubs/[clubId]/mobile-tab-bar.tsx`)
- `[x]` **NAV-MOBILE-003**: The tab bar SHALL surface the same activity signals as the sidebar — active vote, unresponded meeting, unread discussions — as compact dot badges. (`src/app/clubs/[clubId]/mobile-tab-bar.tsx`)
- `[x]` **NAV-MOBILE-004**: The "More" entry SHALL open a sheet exposing secondary destinations (Progress, and admin-only Members/Settings), the club switcher with current club identity/code, and sign-out. (`src/app/clubs/[clubId]/more-sheet.tsx`)
- `[x]` **NAV-MOBILE-005**: The bottom tab bar SHALL clear the home indicator via safe-area padding, and main content SHALL pad its bottom so nothing hides behind the bar. (`src/app/clubs/[clubId]/layout.tsx`)
- `[x]` **NAV-MOBILE-006**: The desktop sidebar and the mobile tab bar SHALL derive their destinations and admin-gating from one shared config module. (`src/app/clubs/[clubId]/nav-items.ts`)

## Responsive overlays (Sheet)

- `[x]` **OVERLAY-SHEET-001**: The system SHALL provide one overlay primitive that renders as a bottom sheet below `md` (anchored bottom, rounded top, slide-up, drag handle, internal scroll, safe-area padding) and as a centered modal at `md+`, dismissable by backdrop tap, Escape, and swipe-down on mobile. (`src/components/ui/sheet.tsx`)
- `[x]` **OVERLAY-SHEET-002**: The Sheet SHALL trap focus and restore it on close, reusing the existing focus-trap utility. (`src/components/ui/sheet.tsx`)
- `[x]` **OVERLAY-SHEET-003**: Existing center-screen modals SHALL be migrated to the Sheet primitive so all overlays share mobile behavior. (`club-switcher-modal.tsx`, `vote/nominate-modal.tsx`, `vote/close-voting-dialog.tsx`, `progress/update-modal.tsx`, `meetings/edit-meeting-dialog.tsx`, `meetings/cancel-meeting-dialog.tsx`)

## Mobile density (no horizontal overflow at 375px)

- `[x]` **DENSITY-MEET-001**: The meeting availability heatmap SHALL keep its member×slot matrix scroll-contained (never overflowing the page) and pin the member-name column with `position: sticky` so names stay visible while the slot columns scroll horizontally on narrow screens. (`src/app/clubs/[clubId]/meetings/admin-confirm.tsx`)
- `[x]` **DENSITY-MEET-002**: The respond-meeting slot controls SHALL stack the status buttons below the time and span full width below `sm`. (`src/app/clubs/[clubId]/meetings/respond-meeting.tsx`)
- `[x]` **DENSITY-MEMBER-001**: The members roster SHALL collapse to a stacked card-like layout below `md` and render as a table at `md+`, using one DOM tree (display utilities) so member/action test ids stay unique. (`src/app/clubs/[clubId]/members/members-client.tsx`)
- `[x]` **DENSITY-VOTE-001**: The voting results leaderboard SHALL collapse its multi-column grid to a stacked layout below `md`. (`src/app/clubs/[clubId]/vote/decided-phase.tsx`)
- `[x]` **DENSITY-VOTE-002**: Nomination cards SHALL keep their title legible on the narrowest screens by stacking or shrinking the cover. (`src/app/clubs/[clubId]/vote/nominating-phase.tsx`)

## Touch & feel polish

- `[x]` **TOUCH-BTN-001**: On coarse pointers, all button sizes SHALL meet a ≥44px touch-target floor without changing fine-pointer (desktop) density. (`src/components/ui/button.tsx`)
- `[x]` **TOUCH-HEADER-001**: The login and join page headers SHALL use responsive padding so they do not clip on small phones. (`src/app/login/page.tsx`, `src/app/join/page.tsx`)
- `[x]` **TOUCH-TOAST-001**: Toasts SHALL sit above the mobile tab bar. (`src/app/clubs/[clubId]/progress/update-modal.tsx`)
