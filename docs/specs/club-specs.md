# Club Management Specs

**LLD**: docs/llds/club-management.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Club Creation

- `[ ]` **CLUB-API-001**: When an authenticated user calls `clubs.create` with name and code, the system SHALL create the club and assign the user as owner.
- `[ ]` **CLUB-DATA-001**: Club codes shall be unique across all active clubs (case-insensitive, stored uppercase).
- `[ ]` **CLUB-DATA-002**: Club codes shall be 4–16 characters, alphanumeric only.
- `[ ]` **CLUB-API-002**: When a user attempts to create a club with a code already in use by an active club, the system SHALL throw a conflict error.

## Joining Clubs

- `[ ]` **CLUB-API-003**: When a user calls `clubs.join` with a valid club code, the system SHALL create a membership with role "member".
- `[ ]` **CLUB-API-004**: When an unauthenticated user calls `clubs.join` with code, email, and display_name, the system SHALL create or find the user, create a session, and create the membership in a single operation.
- `[ ]` **CLUB-API-005**: When a user attempts to join a club they are already a member of, the system SHALL return the existing club data without creating a duplicate membership.
- `[ ]` **CLUB-API-006**: When a user submits an invalid or non-existent club code, the system SHALL throw a not-found error.
- `[ ]` **CLUB-BE-001**: The system shall NOT allow joining clubs with status "archived" or "deleted".

## Club Lookup

- `[ ]` **CLUB-API-007**: The `clubs.lookup` procedure SHALL return the club name and member count without requiring authentication.
- `[ ]` **CLUB-API-008**: The `clubs.lookup` procedure SHALL NOT return any club data beyond name and member count (no book info, no member list, no discussions).

## Club Switching

- `[ ]` **CLUB-NAV-001**: The club switcher UI element shall be visible on every authenticated page.
- `[ ]` **CLUB-UI-001**: When a user selects a different club in the switcher, the system SHALL load that club's current state (current book, upcoming meeting, user's progress) without a full page reload.
- `[ ]` **CLUB-UI-002**: The club switcher shall display an unread activity indicator for clubs with new activity since the user's last visit.

## Roles and Authorization

- `[ ]` **CLUB-BE-002**: The system shall enforce role-based access: member+ for viewing, admin+ for editing settings and managing members, owner for deletion and ownership transfer.
- `[ ]` **CLUB-API-009**: When a non-member attempts to access any club-scoped procedure, the system SHALL throw a forbidden error.
- `[ ]` **CLUB-BE-003**: The owner shall NOT be able to leave the club without first transferring ownership to another member.

## Club Lifecycle

- `[ ]` **CLUB-BE-004**: When the owner deletes a club, the system SHALL soft-delete it (set status to "deleted" and record deleted_at timestamp).
- `[ ]` **CLUB-BE-005**: Soft-deleted clubs shall be hard-deleted (data permanently removed) after 30 days.
- `[ ]` **CLUB-BE-006**: When the owner archives a club, the system SHALL set status to "archived" and reject all write operations except un-archiving.
- `[ ]` **CLUB-DATA-003**: The system shall enforce exactly one owner per club at all times.

## Deferred

- `[D]` **CLUB-BE-007**: The system shall enforce a configurable maximum member limit per club.
- `[D]` **CLUB-UI-003**: The system shall provide an ownership transfer UI with confirmation dialog and notification to the new owner.
