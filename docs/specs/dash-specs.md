# Dashboard and Navigation Specs

**LLD**: docs/llds/club-management.md
**Implementing artifacts**: src/app/clubs/[clubId]/page.tsx, src/app/clubs/[clubId]/layout.tsx

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Sidebar Navigation

- `[x]` **DASH-UI-001**: The sidebar SHALL include a club switcher dropdown showing all clubs the user is a member of, with their role badge (Owner/Admin/Member) and a "Create or join a club" action at the bottom.
- `[x]` **DASH-UI-002**: The sidebar nav SHALL display badge indicators: "Live" on Voting when a round is active, unread count on Discussions when new threads exist since last visit.
- `[ ]` **DASH-UI-003**: The topbar SHALL display a breadcrumb (`Club > Page`) and the club's invite code as a copyable chip.
- `[ ]` **DASH-UI-004**: The topbar SHALL include an "Invite" button that copies the club join link.

## Dashboard Main Content

- `[ ]` **DASH-UI-005**: The dashboard SHALL display a personalized greeting with the current date and an attention summary ("N things need your attention this week").
- `[x]` **DASH-UI-006**: The currently-reading hero card SHALL show book cover, title, author, selection date, and a progress bar with avatar tick-marks positioned at each member's percentage.
- `[x]` **DASH-UI-007**: The hero card SHALL display three stats: median progress (with trend), finished count (with names), and not-started count (with nudge suggestion).
- `[x]` **DASH-UI-008**: Below the hero, three preview cards SHALL show: active vote (with nominee covers and "Cast my vote" CTA), next confirmed meeting (with date block, time, location, attendees), and recent discussions (with chapter chips and reply counts).

## Attention Banner

- `[x]` **DASH-UI-011**: When the user has unvoted active rounds or proposed meetings awaiting their availability response, the dashboard SHALL display an attention banner between the header and the hero card with action items and a CTA linking to the relevant page.

## Deferred

- `[D]` **DASH-UI-009**: The dashboard shall support a notification bell icon with unread count badge.
- `[D]` **DASH-UI-010**: The user menu dropdown shall support theme switching (light/dark).
