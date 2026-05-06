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

Clubs index (`/clubs`, `clubs/page.tsx`):
Button: per-club Link card — `clubs/page.tsx:42-62` — handler: navigates to `/clubs/{clubId}`
Button: "Join a Club →" — `clubs/page.tsx:27-32` — visible: when not authenticated — handler: navigates to `/join`

Create flow (in `/join`, see auth-and-accounts.md for full inventory of Step 3b).

## Gaps (UI not built)

Settings page — `[ ]` admin: name/desc/code edit, archive/unarchive, delete (30-day notice). Mutations exist.
Member management UI — `[ ]` admin: list with remove and promote/demote actions. `clubs.members.remove`, `clubs.members.updateRole` exist.
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
| `clubs.members.updateRole` | owner | `{ clubId, userId, role }` | - |
| `clubs.join` | optional | `{ code, email?, displayName? }` | `{ club }` |
| `clubs.lookup` | none | `{ code }` | `{ clubName, memberCount }` or 404 |

## Authorization Model

| Action | Required Role |
|--------|--------------|
| View club data | member+ |
| Edit club settings | admin+ |
| Change club code | owner |
| Manage members (remove, promote) | admin+ |
| Delete club | owner |
| Transfer ownership | owner |
| Leave club | member+ (owner cannot leave without transferring; not enforced) |

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
