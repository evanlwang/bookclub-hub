# Book Selection and Voting Specs

**LLD**: docs/llds/book-selection-and-voting.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Voting Rounds

- `[ ]` **VOTE-API-001**: When an admin calls `rounds.create`, the system SHALL create the round in "nominating" status.
- `[ ]` **VOTE-API-002**: When an admin calls `rounds.advance` on a round in "nominating", the system SHALL transition it to "voting" status.
- `[ ]` **VOTE-API-003**: When an admin calls `rounds.advance` on a round in "voting", the system SHALL transition it to "decided" status, determine the winner, and set the winning book as the club's current book.
- `[ ]` **VOTE-BE-001**: The winning book shall be determined by highest approval count. Ties shall be broken by earliest nomination timestamp.
- `[ ]` **VOTE-API-004**: When an admin calls `rounds.cancel`, the system SHALL set status to "cancelled" and delete all associated nominations and votes.
- `[ ]` **VOTE-BE-002**: The system shall allow only one active round (status "nominating" or "voting") per club at a time.

## Nominations

- `[ ]` **VOTE-API-005**: When a member calls `nominations.create` during "nominating" phase, the system SHALL add the book to the round.
- `[ ]` **VOTE-API-006**: When a member attempts to nominate a book already nominated in the same round, the system SHALL throw a conflict error.
- `[ ]` **VOTE-API-007**: When a member attempts to nominate during "voting" or "decided" phase, the system SHALL throw a bad-request error.
- `[ ]` **VOTE-DATA-001**: Each nomination shall have a unique (round_id, book_id) pair.

## Voting

- `[ ]` **VOTE-API-008**: When a member calls `votes.submit`, the system SHALL accept a list of nomination_ids and replace all previous votes for that user in that round.
- `[ ]` **VOTE-BE-003**: The system shall enforce that a member cannot approve more than `max_approvals_per_member` nominations in a single round.
- `[ ]` **VOTE-UI-001**: While a round is in "voting" status, the system SHALL hide vote tallies from all members (only show whether the current user has voted).
- `[ ]` **VOTE-UI-002**: When a round reaches "decided" status, the system SHALL display the full vote tallies and winner to all members.
- `[ ]` **VOTE-DATA-002**: The system shall enforce one vote per (round_id, nomination_id, user_id) tuple.

## Book Metadata

- `[ ]` **VOTE-API-009**: The `books.search` procedure SHALL query the Open Library API and return results with title, author, cover URL, and page count.
- `[ ]` **VOTE-BE-004**: The system shall cache book metadata locally after the first lookup to avoid repeated external API calls.
- `[ ]` **VOTE-UI-003**: When the external book API is unavailable, the system SHALL allow manual entry of book title and author.

## Book Selection History

- `[ ]` **VOTE-API-010**: The `selections.list` procedure SHALL return all books the club has read, ordered by selection date (most recent first).
- `[ ]` **VOTE-BE-005**: When an admin creates a BookSelection without a voting round (direct pick), the system SHALL set it as the current book immediately.

## Notifications

- `[ ]` **VOTE-NOTIFY-001**: When a round enters "nominating" status, the system SHALL notify all club members via email.
- `[ ]` **VOTE-NOTIFY-002**: When a round enters "voting" status, the system SHALL notify all club members via email.
- `[ ]` **VOTE-NOTIFY-003**: When a voting deadline is 24 hours away, the system SHALL notify members who have not yet voted.
- `[ ]` **VOTE-NOTIFY-004**: When a round is decided, the system SHALL notify all club members with the winning book.

## Deferred

- `[D]` **VOTE-BE-006**: The system shall enforce a maximum number of nominations per member per round.
- `[D]` **VOTE-UI-004**: The system shall display reading history analytics (genre distribution, author diversity).
- `[D]` **VOTE-UI-005**: Members shall be able to flag a nomination as "already read" to signal the group.
