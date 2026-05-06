# Club Management

## Context and Design Philosophy

Club management is the multi-tenancy backbone. Every other feature (voting, meetings, discussions, progress) is scoped to a club. This LLD defines how clubs are created, how members join via club codes, how roles work, and how the user switches between clubs.

The guiding principle is **isolation by default**: a user sees nothing from a club they don't belong to. There is no global feed, no cross-club search, no public directory. Clubs are private spaces, discoverable only by knowing the club code.

Traces to the HLD's Approach section (Club Management), the Multi-Tenancy key design decision, the Club Joining key design decision, and the Non-Goal (no public discovery).

## Club Codes

Every club has a **club code** — a short, human-readable, alphanumeric string (e.g., `DUNE42`, `WEDREADS`, `SCIFI99`). The code is the only way to join a club. It is set by the organizer at club creation and can be changed later.

Codes are case-insensitive (stored uppercase), 4–16 characters, letters and digits only. They must be unique across all active clubs. The organizer shares the code in their group chat, and members type it into the app.

Why codes over invitation links: a code is the simplest thing to share verbally, in a text message, or on a whiteboard. No URL formatting, no broken links, no expiration tokens. "Join code: DUNE42" is all you need.

## Membership Roles

Three roles, each a strict superset of the one below:

- **owner** — created the club. Can delete the club, transfer ownership, change the club code, and do everything an admin can do. Exactly one owner per club.
- **admin** — can manage members (remove, promote to admin), edit club settings (name, description), and manage voting rounds. Cannot delete the club or transfer ownership.
- **member** — can nominate books, vote, RSVP to meetings, post in discussions, and track progress. Cannot manage other members or club settings.

## Club Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: User creates club
    Active --> Active: Members join/leave
    Active --> Archived: Owner archives
    Archived --> Active: Owner un-archives
    Active --> Deleted: Owner deletes
    Deleted --> [*]
```

- **Active**: normal operation. All features available. New members can join via code.
- **Archived**: read-only. History visible, no new votes/meetings/discussions. Code is deactivated (cannot join). Owner can un-archive.
- **Deleted**: soft-delete. Data retained for 30 days, then hard-deleted. Not recoverable by the user after soft-delete.

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

### Already Logged In

1. User enters club code on the join page
2. Server looks up club by code (case-insensitive)
3. If club not found or not active: error
4. If user is already a member: redirect to club
5. If valid: create Membership (role: member), redirect to club

### Not Logged In

1. User enters club code + email + display name on a combined join page
2. Server finds or creates User by email
3. Server looks up club by code
4. If valid: create Membership, create session, redirect to club

This means a brand-new user can go from zero to inside a club in a single form submission. See the design artboards for the full join flow UI at `docs/bookclub-hub-designs/project/artboards/landing-join.jsx`.

## Club Creation

1. User (must be logged in) clicks "Create a club"
2. Enters: club name, description (optional), club code (with uniqueness check)
3. Server creates Club, creates Membership (role: owner)
4. User lands in the new (empty) club

See the design artboards for the visual implementation of club creation forms and validation feedback.

## Club Switcher

The club switcher is a persistent UI element (sidebar on desktop, bottom sheet on mobile) visible on every authenticated page. It displays:
- Club list with avatars and club codes
- Current book, next meeting, and user's reading progress
- Unread activity indicators
- "Create new club" or "Join with code" option

Switching clubs is a client-side operation: the app fetches the target club's current state (current book, upcoming meeting, user's progress) and re-renders. No page reload. Target: under 30 seconds per the HLD goal.

For visual details on the club switcher layout and responsive behavior, see `docs/bookclub-hub-designs/project/artboards/dashboard.jsx` and `docs/design-system.md` → Components.

## API Contracts

Endpoints below are logical contracts. The implementation uses tRPC procedures (e.g., `clubs.list()`, `clubs.join(...)`) rather than REST routes.

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `clubs.list` | required | - | `[{ club, role, current_book, unread_count }]` |
| `clubs.create` | required | `{ name, description, code }` | `{ club }` (creator becomes owner) |
| `clubs.get` | member | `{ clubId }` | `{ club, members, current_book }` |
| `clubs.update` | admin+ | `{ clubId, name?, description?, code? }` | `{ club }` |
| `clubs.delete` | owner | `{ clubId }` | (soft delete) |
| `clubs.members.list` | member | `{ clubId }` | `[{ user, role, joined_at }]` |
| `clubs.members.remove` | admin+ (or self) | `{ clubId, userId }` | - |
| `clubs.members.updateRole` | owner | `{ clubId, userId, role }` | - |
| `clubs.join` | optional | `{ code, email?, display_name? }` | `{ club }` (creates session if not logged in) |
| `clubs.lookup` | none | `{ code }` | `{ club_name, member_count }` or 404 |

`clubs.lookup` is unauthenticated — it lets the join form show the club name before the user submits. It returns minimal info (name, member count) to avoid leaking club data.

## Authorization Model

All club-scoped API endpoints check membership before processing. The check is: "does a Membership record exist for (request.user_id, :club_id) and is the role sufficient?"

| Action | Required Role |
|--------|--------------|
| View club data | member+ |
| Edit club settings | admin+ |
| Change club code | owner |
| Manage members (remove, promote) | admin+ |
| Delete club | owner |
| Transfer ownership | owner |
| Leave club | member+ (owner cannot leave without transferring) |

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Join mechanism | Club code (short alphanumeric) | Shareable invitation links; email-sent invites; QR codes | Club code is the simplest thing to share in a group chat or say out loud. No URL formatting, no tokens, no expiration. "Join code: DUNE42" is all you need. |
| Code format | 4–16 chars, alphanumeric, case-insensitive | UUID-based; numeric-only; auto-generated | Human-chosen codes are memorable and shareable. Auto-generated codes are harder to remember. Numeric-only is too collision-prone in short lengths. |
| Code uniqueness | Unique across active clubs | Globally unique (including deleted); no uniqueness (password-style) | Active-only uniqueness recycles codes from deleted clubs. Global uniqueness would exhaust short codes over time. No uniqueness requires a club ID + code combo, which is more friction. |
| Role model | Three roles (owner, admin, member) | Two roles (owner, member); fine-grained permissions | Three roles is the minimum that covers the use cases. Fine-grained permissions add UI complexity without clear benefit. |
| Club deletion | Soft delete with 30-day retention | Hard delete immediately; archive-only (no delete) | Soft delete prevents accidental data loss. 30-day retention bounds storage. Archive-only doesn't respect the user's intent to remove. |

## Open Questions & Future Decisions

### Resolved

1. ✅ Club codes as join mechanism (not invitation links).
2. ✅ Three-tier role model.
3. ✅ Soft delete with 30-day retention.

### Deferred

1. **Club settings beyond name/description.** Timezone, default voting method, notification preferences. These will emerge as other features crystallize.
2. **Member limit per club.** No hard cap in v1.
3. **Ownership transfer UX.** The API supports it; the UI flow is deferred to implementation.
4. **Code regeneration rate limiting.** Prevent an owner from burning through codes. Not urgent for v1 scale.

## Design Reference

**Visual implementation:** See `docs/bookclub-hub-designs/project/artboards/dashboard.jsx` (sidebar shell, club switcher, main dashboard area).

**Design tokens & components:**
- Sidebar club switcher: left panel (responsive: sidebar on desktop, bottom sheet on mobile)
- Club avatar/code: `--ink` text on `--primary-soft` background, monospace font for code
- Club cards in switcher: show current book cover (`BookCover` small size), next meeting date, member count
- Unread indicator: `Badge tone="accent"` dot for new activity
- Dashboard main area: header with club name (Display serif, 32px), content area with cards

**Key patterns:**
- **Club creation modal:**
  - Name input (max 100 chars)
  - Description textarea (optional, max 500 chars)
  - Code input with real-time availability check (`✓ Available` / `✗ Taken`)
  - `btn-primary` for submit, `btn-secondary` for cancel

- **Club switcher mobile:**
  - Bottom sheet on mobile, sidebar on desktop (breakpoint ~768px)
  - Club list scrollable, each item clickable to switch
  - [+] button to create new club or join with code

- **Member management (admin view):**
  - Member list in a table or card stack
  - Avatar, name, role badge, joined date
  - Remove button (dangerous variant) with confirmation
  - Promote/demote dropdown for role changes

- **Club settings page (admin):**
  - Name, description, code editable
  - Archive/unarchive toggle (danger action)
  - Delete button (soft delete with 30-day retention notice)

**Typography & spacing:**
- Club name in switcher: Title serif (20px)
- Metadata (next meeting, progress): Caption class (12px, secondary ink)
- Current book cover: Small size (48×70), rounded corners
- Spacing between clubs: 12–16px

## References

- `docs/high-level-design.md`
- `docs/llds/auth-and-accounts.md` — identity provides the user that membership references
- `docs/specs/club-specs.md`
- `docs/design-system.md` — design tokens, BookCover component, Avatar component
