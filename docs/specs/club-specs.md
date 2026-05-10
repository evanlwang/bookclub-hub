# Club Management Specs

**LLD**: docs/llds/club-management.md
**Implementing artifacts**:
- API: `src/server/routers/clubs.ts` (membership procedures live under `clubs.members.*` in the same file)
- UI: `src/app/clubs/[clubId]/sidebar.tsx`, create/join via `src/app/join/page.tsx`, in-place modal `src/components/club/club-switcher-modal.tsx`
- Tests: `tests/integration/clubs.test.ts`, `tests/e2e/multi-club-switching.spec.ts`, `tests/e2e/switcher-create-join.spec.ts`, `tests/e2e/members-management.spec.ts`, `tests/unit/auth/permissions.test.ts` (club-permissions, currently mislocated under `auth/`), `tests/unit/validation/club-code.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Club State

State: active — buttons shown: all club features (vote/meet/discuss/progress) enabled — transitions: → archived (admin/owner; UI not built); → deleted (owner; UI not built)
State: archived — buttons shown: read-only history; no creation/edit/join — transitions: → active (un-archive; UI not built)
State: deleted — buttons shown: none — transitions: terminal (hard-delete after 30 days)

The active/archived/deleted lifecycle is encoded in the data model but only "active" is exercised by the UI.

## Club Creation API

- `[x]` **CLUB-API-001**: When an authenticated user calls `clubs.create`, the system SHALL create the club and assign the user as owner.
- `[x]` **CLUB-DATA-001**: Club codes SHALL be unique across all active clubs (case-insensitive, stored uppercase).
- `[x]` **CLUB-DATA-002**: Club codes SHALL be 4–16 characters, alphanumeric only.
- `[x]` **CLUB-API-002**: When a user attempts to create a club with a code already in use by an active club, the system SHALL throw a CONFLICT error.

## Club Creation UI (Step 3b in /join)

- `[x]` **CLUB-UI-001**: The create branch SHALL auto-derive an invite code from the club name (alphanumeric, uppercase, max 10 chars; defaults to "CLUB" if name is empty/non-alphanumeric). The derived code is shown as the default value of an editable input. (`join/page.tsx:191-195`)
- `[x]` **CLUB-UI-002**: When the user modifies the auto-derived code, the system SHALL validate the new code against existing clubs and show an error if the code is already in use. Validation runs on submit via a `clubs.lookup` call inside `handleCreateSubmit` (`join/page.tsx:333-348, 351-392`); the SHALL is satisfied. The older "real-time as the user types" UX is tracked separately as the sub-ID gap below:
  - `[x]` **CLUB-UI-CODE-LIVE-001**: The Step-3b invite-code input SHALL run a 300ms-debounced `clubs.lookup` whenever the effective code (typed value or auto-derived value, ≥4 chars and not the empty-string fallback `"CLUB"`) changes. The status SHALL be surfaced via a sibling `data-testid="code-status"` element carrying `data-state` ∈ `{idle, loading, available, taken}` and `aria-live="polite"`. When `taken`, the input gets a danger border + `aria-invalid="true"` and the Create button SHALL be disabled. Network errors are treated as `available` so transient blips never block the user; the on-submit `validateClubCode` is the authoritative gate. (`src/app/join/page.tsx`)
- `[x]` **CLUB-UI-003**: On successful club creation, the system SHALL display the invite code prominently on Step 4 with a Button: "Copy" that calls `navigator.clipboard.writeText`. (`join/page.tsx:723-730`)

## Club Join API

- `[x]` **CLUB-API-003**: When a user calls `clubs.join` with a valid club code, the system SHALL create a membership with role "member".
- `[x]` **CLUB-API-004**: When an unauthenticated user calls `clubs.join` with `code, email, displayName`, the system SHALL create or find the user, create a session, and create the membership in a single operation. The `clubs.join` procedure (`src/server/routers/clubs.ts:362-440`) is a `publicProcedure` whose unauthenticated branch (when `ctx.user` is null) requires `email + displayName + passcode`, validates them, upserts the user, creates a session, and then creates the membership — all in the same mutation. The current UI flows through Step 1 first by convention, but the API supports the combined flow.
- `[x]` **CLUB-API-005**: When a user attempts to join a club they're already in, the system SHALL return the existing club data without creating a duplicate membership.
- `[x]` **CLUB-API-006**: When a user submits an invalid or non-existent club code, the system SHALL throw a NOT_FOUND error.
- `[x]` **CLUB-BE-001**: The system SHALL NOT allow joining clubs with status "archived" or "deleted". Enforced in `clubs.join` (`src/server/routers/clubs.ts:375-388`): finds only `status: "active"` clubs; if the code resolves to an inactive club, throws `FORBIDDEN` "This club is no longer active".

## Club Lookup API

- `[x]` **CLUB-API-007**: The `clubs.lookup` procedure SHALL return the club name and member count without requiring authentication.
- `[x]` **CLUB-API-008**: `clubs.lookup` SHALL NOT return any data beyond name and member count.

## Club Switcher (Sidebar)

- `[x]` **CLUB-NAV-001**: The club switcher UI SHALL be visible on every authenticated club-scoped page via the sidebar dropdown. (`sidebar.tsx:50-95`)
- `[x]` **CLUB-NAV-002**: The switcher header is a Button that toggles a dropdown listing all clubs the user is a member of. The chevron icon rotates 180° when open. (`sidebar.tsx:51-69`)
- `[x]` **CLUB-NAV-003**: Each club row in the dropdown is a Link to `/clubs/{clubId}`, displaying the club name and a role Badge ("admin" / "member"). The current club is highlighted with `font-medium text-ink`. (`sidebar.tsx:74-84`)
- `[x]` **CLUB-NAV-004**: At the bottom of the dropdown, a "Create or join a club" entry SHALL be present. It opens the Switcher Modal in place (see CLUB-NAV-MODAL-001). The legacy `/clubs` landing page was removed once login/join started routing straight into a club, so this dropdown entry is the canonical entry point for adding additional clubs.

## Switcher Create/Join Modal

- `[x]` **CLUB-NAV-MODAL-001**: When a signed-in user activates "Create or join a club" in the switcher dropdown, the system SHALL open an in-page centered Dialog instead of navigating to `/clubs`. (`sidebar.tsx`, `components/club/club-switcher-modal.tsx`)
- `[x]` **CLUB-NAV-MODAL-002**: The modal SHALL present two tabs — "Join with code" and "Create new club" — defaulting to Join.
- `[x]` **CLUB-NAV-MODAL-003**: The Join tab SHALL accept a club code, debounce-validate it via `clubs.lookup`, and enable the submit button only when a club is found.
- `[x]` **CLUB-NAV-MODAL-004**: On a successful join, the system SHALL navigate to `/clubs/{joinedClubId}` and call `router.refresh()` so the sidebar's club list (loaded server-side from `auth.me`) reflects the new membership.
- `[x]` **CLUB-NAV-MODAL-005**: If the user is already a member of the entered code's club, the system SHALL surface "You're already a member of this club" and offer a "Go to club" action without creating a duplicate membership.
- `[x]` **CLUB-NAV-MODAL-006**: The Create tab SHALL accept name, auto-derived editable code, and voting cadence — mirroring `/join` Step 3b — and SHALL validate code uniqueness on submit via `clubs.lookup`.
- `[x]` **CLUB-NAV-MODAL-007**: On a successful create, the modal SHALL surface the invite code with a copy action, and on user dismissal SHALL navigate to the new club and refresh the layout.
- `[x]` **CLUB-NAV-MODAL-008**: The modal SHALL be dismissible via Escape, backdrop click, and an explicit close button; dismissal SHALL be blocked while a mutation is in flight.
- `[x]` **CLUB-NAV-MODAL-010**: When the modal opens, the switcher dropdown SHALL close so it is not stacked behind the Dialog.
- `[x]` **CLUB-NAV-CLIENT-001**: Switcher navigation is fully client-side — the sidebar dropdown uses `next/link` `<Link>` rows (default-prefetched into the viewport on render), and the in-place create/join modal uses `router.push` (no browser reload). When a join lookup resolves to an "already a member" outcome, the modal calls `router.prefetch` on the target club's route so the subsequent "Go to club" click hands off to a pre-warmed RSC tree. (`src/app/clubs/[clubId]/sidebar.tsx:202-223`, `src/components/club/club-switcher-modal.tsx`)
- `[x]` **CLUB-NAV-UNREAD-001**: Switcher dropdown rows for non-current clubs with `unreadDiscussionCount > 0` SHALL render a small accent dot beside the club name (`data-testid="switcher-unread-{clubId}"`, `aria-label="{N} new discussion(s)"`). The count is computed by `clubs.unreadDiscussionCounts` (compares `Membership.lastVisitedDiscussions ?? joinedAt` to `DiscussionThread.createdAt`). Visiting `/clubs/{id}/discussions` calls `clubs.markDiscussionsVisited` on mount, which refreshes the layout RSC so the badge clears in place. Activity scope is currently discussions-only; meetings/voting activity badges deferred. (`prisma/schema.prisma` `Membership.lastVisitedDiscussions`; `src/server/routers/clubs.ts`; `src/app/clubs/[clubId]/sidebar.tsx`; `mark-visited.tsx`)

## Sidebar Nav (per-club)

- `[x]` **DASH-NAV-001**: The sidebar SHALL render five nav links: Dashboard / Voting / Meetings / Discussions / Progress. The active link uses `bg-primary-soft text-primary-ink`. (`sidebar.tsx:18-126`)
- Voting "Live" badge and Discussions unread badge are owned by `dash-specs.md` (DASH-UI-002 and DASH-UI-NAV-UNREAD-001 respectively); see that file for status.

## Roles and Authorization

- `[x]` **CLUB-BE-002**: Role-based access enforcement: member+ for viewing, admin+ for editing settings and managing members, owner for deletion and ownership transfer. (Enforced at tRPC procedure level via `memberProcedure` / `adminProcedure`.) Note: `members.remove` is admin+; `members.updateRole` is owner-only; `members.transferOwnership` is owner-only.
- `[x]` **CLUB-API-009**: When a non-member attempts to access any club-scoped procedure, the system SHALL throw a FORBIDDEN error.
- `[x]` **CLUB-BE-003**: The owner SHALL NOT be able to leave the club without first transferring ownership. Enforced by `clubs.leave` (CLUB-BE-LEAVE-001).

## Club Lifecycle Gaps

- `[x]` **CLUB-BE-004**: `clubs.delete` (owner-only) SHALL set `status="deleted"` and `deletedAt = now` rather than hard-deleting the row, preserving the option to recover for a grace window. Enforced at `src/server/routers/clubs.ts:169-191` via owner-role check + `club.update` to `{ status: "deleted", deletedAt: new Date() }`.
- `[x]` **CLUB-BE-005**: A scheduled cron at `src/app/api/cron/hard-delete-clubs/route.ts` selects clubs whose `status === "deleted"` AND `deletedAt <= now - 30d`, then issues `db.club.delete(...)` (CASCADE-cleans memberships, voting rounds, meetings, threads via the existing FK relations). The route requires the `CRON_SECRET` header, mirroring `voting-deadline-reminder/route.ts`. **Operational note:** the cron must be wired in the deployment platform's scheduler (e.g. Vercel Cron config) — not yet declared in `vercel.json`.
- `[ ]` **CLUB-BE-006**: When the owner archives, the system SHALL set status="archived" and reject all writes except un-archive.
- `[x]` **CLUB-DATA-003**: Exactly one owner per club at all times. Maintained by `transferOwnership` running inside `prisma.$transaction` (demote + promote in one statement) and by `clubs.leave` rejecting owner self-removal.

## Member Management

- `[x]` **CLUB-UI-MEMBERS-001**: A members page SHALL exist at `/clubs/[clubId]/members` exposing the table/cards with avatar, name, email, role, joined date, and role-gated actions (remove, promote/demote, transfer, leave). (Implemented by CLUB-UI-MEMBERS-002+.)
- `[x]` **CLUB-UI-MEMBERS-002**: The members page SHALL render a table of all club members with avatar, display name, email, role badge, and joined date — visible to admin+. Members not at admin+ SHALL be redirected (or shown an authorization error) on this route.
- `[x]` **CLUB-UI-MEMBERS-003**: An admin+ SHALL see a "Remove" action on each non-owner row; clicking it SHALL open a confirmation dialog naming the member, and on confirm SHALL call `clubs.members.remove`.
- `[x]` **CLUB-UI-MEMBERS-004**: An owner SHALL see "Promote to admin" / "Demote to member" actions on member/admin rows respectively, calling `clubs.members.updateRole`. Admins SHALL NOT see these actions.
- `[x]` **CLUB-UI-MEMBERS-005**: The owner row SHALL be visually marked (badge tone="primary") and SHALL NOT expose Remove or Demote actions.
- `[x]` **CLUB-UI-MEMBERS-006**: After any successful mutation, the table SHALL refresh (`router.refresh()`) without a full page reload.
- `[x]` **CLUB-NAV-MEMBERS-001**: The sidebar SHALL render a "Members" nav link, visible only when the current user's role on the club is `admin` or `owner`.
- `[x]` **CLUB-API-OWNERSHIP-001**: A new mutation `clubs.members.transferOwnership` (owner-only) SHALL atomically demote the caller to "admin" and promote the target user (must be an existing member) to "owner". The transaction SHALL maintain the CLUB-DATA-003 invariant.
- `[x]` **CLUB-UI-OWNERSHIP-001**: Ownership transfer UI with confirmation dialog. (Implemented by CLUB-UI-OWNERSHIP-002+.)
- `[x]` **CLUB-UI-OWNERSHIP-002**: An owner SHALL see a "Transfer ownership" action on every admin row (admins only — promote a member first if needed). Clicking it SHALL open a typed-confirmation dialog (user types the target's display name) before calling `clubs.members.transferOwnership`.
- `[x]` **CLUB-UI-OWNERSHIP-003**: After a successful transfer, the system SHALL refresh the page so the (former) owner now sees themselves as admin and the new owner is highlighted.
- `[x]` **CLUB-BE-LEAVE-001**: A new mutation `clubs.leave` (member+) SHALL remove the caller's own membership. If the caller is the owner, it SHALL throw `FORBIDDEN` with message "Transfer ownership before leaving."
- `[x]` **CLUB-UI-MEMBERS-LEAVE-001**: A non-owner SHALL see a "Leave club" action on their own row; on confirm it SHALL call `clubs.leave` and redirect to `/clubs`. The owner SHALL NOT see this action — instead, the row SHALL display a hint reading "Transfer ownership to leave."

## Settings Page Gaps

- `[ ]` **CLUB-UI-SETTINGS-001**: Admin Settings page (name / description / code edit, archive/unarchive toggle, delete with 30-day notice). Mutations may exist on `clubs.update` / `clubs.delete`; no UI surfaces them.

## Topbar Gaps

(Canonical IDs live in dash-specs.md; cross-referenced here because they fall in the club-management UI surface.)

- `[D]` **CLUB-UI-TOPBAR-CHIP-001** (= `DASH-UI-003`): Deferred. See dash-specs.md.
- `[D]` **CLUB-UI-TOPBAR-INVITE-001** (= `DASH-UI-004`): Deferred. See dash-specs.md.

## Deferred

- `[D]` **CLUB-BE-007**: Configurable maximum member limit per club.
- `[D]` **CLUB-UI-OWNERSHIP-NOTIFY-001**: Email/notification to the new owner upon ownership transfer. (CLUB-UI-OWNERSHIP-001 is now implemented for the UI surface; transactional notification deferred.)
