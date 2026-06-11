# Club Management

## Context and Design Philosophy

Club management is the multi-tenancy backbone. Every other feature (voting, meetings, discussions, progress) is scoped to a club. This LLD defines how clubs are created, how members join via club codes, how roles work, and how the user switches between clubs.

The guiding principle is **isolation by default**: a user sees nothing from a club they don't belong to. There is no global feed, no cross-club search, no public directory. Clubs are private spaces, discoverable only by knowing the club code.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Club Lifecycle State

ASCII state diagram:

```
active → archived → active
active → deleted
```

State: active — buttons shown: all features (vote/meet/discuss/progress) — transitions: → archived (admin/owner; no UI); → deleted (owner; no UI)
State: archived — buttons shown: read-only history (no UI to enter this state today) — transitions: → active (un-archive; no UI)
State: deleted — buttons shown: none — transitions: terminal; hard-delete after 30 days (not enforced today)

Today only the "active" state is exercised in the UI; archived/deleted lifecycle is data-model-only.

## Button Inventory

Sidebar (`sidebar.tsx`):
Button: club header dropdown toggle — `sidebar.tsx:51-69` — handler: setSwitcherOpen
Button: per-club row in dropdown — `sidebar.tsx:74-84` — handler: navigates to `/clubs/{id}` (full route load)
Button: "Create or join a club" — `sidebar.tsx` — handler: opens ClubSwitcherModal (CLUB-NAV-MODAL-001)
Button: Dashboard / Voting / Meetings / Discussions / Progress nav link — `sidebar.tsx:99-126` — visible: always — active styling when path matches

Create flow (in `/join`, see auth-and-accounts.md for full inventory of Step 3b).

The standalone `/clubs` index page was removed: login/join now route the user straight into a club, and switching is handled by the sidebar dropdown + in-place "Create or join a club" modal (see CLUB-NAV-001 and CLUB-NAV-MODAL-001).

## Gaps (UI not built)

Settings page — `[ ]` admin: name/desc/code edit, archive/unarchive, delete (30-day notice). Mutations exist.
Member management UI — `[x]` admin: list with remove and promote/demote actions. `clubs.members.remove`, `clubs.members.updateRole`, `clubs.members.transferOwnership`, `clubs.leave`. (`/clubs/[clubId]/members`)
Topbar invite chip ("OAKWOOD-7Q · Copy") — `[ ]` not in any topbar; invite code is shown only on the dashboard header and on Step 4 success.
Topbar "Invite" button — `[ ]` not implemented.
Real-time code-availability check during create — `[ ]` only on submit today.
Unread activity indicators on switcher rows — `[ ]` not implemented.
Unread count Badge on Discussions nav link — `[ ]` not implemented.
Client-side switcher (no full route load) — `[ ]` switching today is a Link navigation.
Archive/un-archive flow — `[ ]` not implemented.
Soft-delete with 30-day retention and hard-delete job — `[ ]` not implemented.

## Club Codes

Every club has a **club code** — a short, human-readable, alphanumeric string (e.g., `DUNE42`, `WEDREADS`). The code is the only way to join a club. Set by the organizer at creation and (by spec) changeable later. Codes are case-insensitive (stored uppercase), 4–16 chars, letters and digits only. Unique across active clubs.

Why codes over invitation links: a code is the simplest thing to share verbally, in a text message, or on a whiteboard.

## Membership Roles

Three roles, each a strict superset of the one below:

- **owner** — created the club. Can delete, transfer ownership, change code.
- **admin** — can manage members, edit settings, manage voting rounds.
- **member** — can nominate, vote, RSVP, post, track progress.

UI today renders only `admin` / `member` Badges in the switcher (owner appears as "owner" string). Member management UI is not built.

## Data Model

```
Club {
  id: UUID (PK)
  name: string (max 100 chars)
  description: string (max 500 chars, nullable)
  code: string (unique, uppercase, 4-16 chars, alphanumeric)
  theme_color: string (7-char hex `#rrggbb`, nullable; null = inherit global)
  created_by: UUID (FK -> User)
  status: enum("active", "archived", "deleted")
  deleted_at: timestamp (nullable)
  created_at: timestamp
  updated_at: timestamp
}

Membership {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  user_id: UUID (FK -> User)
  role: enum("owner", "admin", "member")
  joined_at: timestamp
  UNIQUE(club_id, user_id)
}
```

No Invitation table. The club code on the Club record is the only join mechanism.

## Join Flow

### Already Logged In (current UI)

1. User enters club code on Step 3a of `/join` (after Step 1 identity).
2. Debounced `clubs.lookup` validates the code. On valid result, "Join" button enables.
3. User clicks "Join {clubName}" → `clubs.join` → membership created → Step 4 → auto-redirect.

### Not Logged In (per API)

1. User enters club code + email + display name (combined). The current UI sequences these across Step 1 and Step 3a, but `clubs.join` itself accepts a combined payload.

## Club Creation

1. User completes Step 1 (identity).
2. Step 2 path choice → "Create a new club" → Step 3b.
3. Form: name (required, ≥3 chars), auto-derived code (editable, uppercase, alphanumeric, max 10 chars), voting cadence radio (monthly / six_weeks / flexible).
4. On submit: `validateClubCode` (one `clubs.lookup` call) → `clubs.create` with `description = "Voting cadence: {cadence}"`.
5. Step 4: invite code with "Copy" button → auto-redirect to `/clubs/{id}`.

## Club Switcher

Sidebar dropdown on every club-scoped page. Lists all clubs the user is in. Each row links to `/clubs/{id}` (full route load). Bottom row is "Create or join a club" → opens the Switcher Modal in place. The Voting nav link displays a "Live" Badge (accent dot) when an active round exists for the current club.

## Live Nav Badges

Mechanism owned by `docs/llds/live-updates.md`. The three badge inputs the club layout previously computed from separate RSC fetches (`rounds.list`, `meetings.list`, `clubs.unreadDiscussionCounts`) consolidate into one member-scoped `clubs.navState` query returning `{ hasActiveVote, hasUnrespondedMeeting, unreadDiscussionCounts }` (CLUB-API-NAVSTATE-001) — `unreadDiscussionCounts` stays the cross-club map because the switcher dots (CLUB-NAV-UNREAD-001) consume it. The layout RSC seeds a `useNavState(clubId, initial)` client hook (60s poll); `ClubSidebar`, `MobileTabBar`, and `MobileClubHeader` read the hook instead of props. Feature mutations that affect badges call `utils.clubs.navState.invalidate()` instead of `router.refresh()` (CLUB-NAV-BADGE-LIVE-001); visiting discussions clears the unread badge the same way.

## Switcher Modal Flow

Centered `<Dialog>` opened from the switcher dropdown for users who are already authenticated. Skips the identity step that `/join` enforces and runs only the join-by-code or create-club paths.

```
sidebar dropdown
  └─ "Create or join a club" button
        ├─ closes dropdown
        └─ opens ClubSwitcherModal
              ├─ Tab: Join with code
              │     code input → debounced clubs.lookup → submit clubs.join
              │     → router.push("/clubs/{id}") → router.refresh()
              └─ Tab: Create new club
                    name + derived code + cadence → clubs.lookup (uniqueness)
                    → clubs.create → success view with code + Copy
                    → on dismissal: router.push + router.refresh
```

The modal reuses the existing `clubs.lookup`, `clubs.join`, and `clubs.create` procedures; no new API. Idempotent join (already a member) shows a "Go to club" affordance instead of an error. Dismissal (Esc / backdrop / close button) is blocked while a mutation is in flight to avoid leaving the user with partial state.

The sidebar's clubs list is loaded server-side via `auth.me` in `clubs/[clubId]/layout.tsx`; `router.refresh()` after the navigation re-fetches it so the new club appears in the dropdown without a hard reload.

## API Contracts

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `clubs.list` | required | - | `[{ club, role, current_book?, unread_count? }]` |
| `clubs.create` | required | `{ name, description, code }` | `{ club }` (creator becomes owner) |
| `clubs.get` | member | `{ clubId }` | `{ club, members, current_book }` |
| `clubs.update` | admin+ | `{ clubId, name?, description?, code? }` | `{ club }` |
| `clubs.delete` | owner | `{ clubId }` | (soft delete) |
| `clubs.members.list` | member | `{ clubId }` | `[{ user, role, joinedAt }]` |
| `clubs.members.remove` | admin+ (or self) | `{ clubId, userId }` | - |
| `clubs.members.updateRole` | owner | `{ clubId, userId, role: "admin" \| "member" }` | - |
| `clubs.members.transferOwnership` | owner | `{ clubId, newOwnerUserId }` | `{ ok: true }` |
| `clubs.leave` | member+ | `{ clubId }` | `{ ok: true }` (owner blocked) |
| `clubs.join` | optional | `{ code, email?, displayName? }` | `{ club }` |
| `clubs.lookup` | none | `{ code }` | `{ clubName, memberCount }` or 404 |
| `clubs.navState` | member | `{ clubId }` | `{ hasActiveVote, hasUnrespondedMeeting, unreadDiscussionCounts }` (CLUB-API-NAVSTATE-001) |

## Theming (Per-Club Primary Color)

A club may customize its primary CTA color. The chosen value lives on the Club row as `themeColor` (nullable 7-char hex). When set, the per-club layout (`src/app/clubs/[clubId]/layout.tsx`) server-renders an inline `<style>` block scoped to that subtree, overriding four CSS variables:

- `--color-primary`: the picked hex.
- `--color-primary-hover`: `color-mix(in oklch, ${hex} 85%, black)`.
- `--color-primary-soft`: `color-mix(in oklch, ${hex} 18%, white)`.
- `--color-primary-ink`: `color-mix(in oklch, ${hex} 80%, black)`.

`color-mix(in oklch, …)` re-enters perceptual color space for the derivations so hover/soft/ink track the picked hue rather than the original teal. Cream paper backgrounds and ink text are untouched; the per-club theme is a primary-CTA accent, not a full retheme.

Null `themeColor` ⇒ no `<style>` injection ⇒ inherits the global default (currently `oklch(0.42 0.06 195)`, "Forest Teal").

The Settings UI offers five curated swatches plus a "Custom" tile. The Forest Teal swatch is the global default — picking it persists `themeColor = null` (inherit, no override). The other four (Library Burgundy, Indigo Manuscript, Slate & Persimmon, Plum Velvet) persist their hex value. The Custom tile opens the native `<input type="color">` picker; the resulting hex is persisted directly. v1 ships without a contrast guard for custom picks (see `CLUB-UI-THEME-CONTRAST-001 [D]`); the curated swatches are pre-tuned for the cream paper background.

## Authorization Model

| Action | Required Role |
|--------|--------------|
| View club data | member+ |
| Edit club settings | admin+ |
| Change club code | owner |
| Remove non-owner member | admin+ |
| Promote member ↔ admin | owner |
| Delete club | owner |
| Transfer ownership | owner |
| Leave club | member+ (owner blocked by `clubs.leave`; must transfer first) |

## Members Page Flow

Route: `/clubs/[clubId]/members`. Server component loads `clubs.members.list` + the caller's role from `clubs.get` and renders a client table. Members at role="member" are redirected (or shown a 403 error card) — only admins and owners may view.

Each row exposes a role-gated action menu:

```
viewer   target            actions surfaced
─────────────────────────────────────────────────────────────────
admin    member            Remove
admin    admin             Remove
admin    owner             (none)
admin    self              Leave club
owner    member            Promote to admin · Remove
owner    admin             Demote to member · Transfer ownership · Remove
owner    owner (self)      (no Leave; row hint: "Transfer ownership to leave")
```

Mutations call existing/new tRPC procedures and `router.refresh()` on success so the table re-fetches without a hard reload. Destructive actions (Remove, Leave) use a name-confirmation dialog. Transfer ownership uses a typed-confirmation dialog (user types the target's display name).

## Ownership Transfer

A new tRPC mutation `clubs.members.transferOwnership` (owner-only):

```
input  : { clubId, newOwnerUserId }
guards : - caller is the current owner of the club
         - newOwnerUserId is an existing admin (UI restricts; API also enforces)
         - newOwnerUserId !== caller.id
runs   : prisma.$transaction([
           membership.update(currentOwner → role="admin"),
           membership.update(newOwner → role="owner"),
         ])
returns: { ok: true }
```

The transaction enforces `CLUB-DATA-003` (exactly one owner) by demoting and promoting in a single statement. After success the client calls `router.refresh()`; the former owner sees themselves as admin on the next render.

## Owner-Cannot-Leave Enforcement

`clubs.leave` (member+) removes the caller's own membership. If the caller's role is `owner`, the procedure throws `FORBIDDEN` with the message "Transfer ownership before leaving." This is the API-level enforcement of `CLUB-BE-003`. The UI parallels this: the owner's own row shows a hint instead of a Leave action.

## Decisions & Alternatives

| Decision | Chosen | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Join mechanism | Club code | Invitation links; QR codes; email-sent invites | Simplest thing to share. |
| Code format | 4–16 alphanumeric, case-insensitive | UUID; numeric only | Memorable and shareable. |
| Code uniqueness | Unique across active clubs | Globally unique (incl. deleted); none | Recycles codes from deleted clubs. |
| Role model | Three roles | Two; fine-grained permissions | Minimum that covers use cases. |
| Club deletion | Soft delete + 30-day retention (target) | Hard delete; archive-only | Prevents accidental data loss. (Not enforced today.) |

## Open Questions

### Resolved

1. ✅ Club codes as join mechanism.
2. ✅ Three-tier role model.
3. ✅ Sidebar club switcher.

### Deferred

1. **Settings page** (admin: rename, change code, archive/delete).
2. **Member management UI** (admin: remove, promote/demote).
3. **Topbar invite chip + Invite button.**
4. **Real-time code-availability validation during create.**
5. **Unread activity indicators on switcher and Discussions nav.**
6. **Client-side switcher with prefetch.**
7. **Archive/un-archive flow + soft-delete enforcement + hard-delete job.**
8. **Owner-cannot-leave-without-transfer enforcement.**

## References

- `docs/specs/club-specs.md`
- `docs/llds/auth-and-accounts.md` — identity provides the user that membership references
- `docs/specs/dash-specs.md` — sidebar nav and dashboard composition
- `docs/high-level-design.md`
