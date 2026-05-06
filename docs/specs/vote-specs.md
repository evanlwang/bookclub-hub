# Book Selection and Voting Specs

**LLD**: docs/llds/book-selection-and-voting.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Voting Rounds

- `[x]` **VOTE-API-001**: When an admin calls `rounds.create`, the system SHALL create the round in "nominating" status.
- `[x]` **VOTE-API-002**: When an admin calls `rounds.advance` on a round in "nominating", the system SHALL transition it to "voting" status.
- `[x]` **VOTE-API-003**: When an admin calls `rounds.advance` on a round in "voting", the system SHALL transition it to "decided" status, determine the winner, and set the winning book as the club's current book.
- `[x]` **VOTE-BE-001**: The winning book shall be determined by highest approval count. Ties shall be broken by earliest nomination timestamp.
- `[x]` **VOTE-API-004**: When an admin calls `rounds.cancel`, the system SHALL set status to "cancelled" and delete all associated nominations and votes.
- `[x]` **VOTE-BE-002**: The system shall allow only one active round (status "nominating" or "voting") per club at a time.

## Nominations

- `[x]` **VOTE-API-005**: When a member calls `nominations.create` during "nominating" phase, the system SHALL add the book to the round.
- `[x]` **VOTE-API-006**: When a member attempts to nominate a book already nominated in the same round, the system SHALL throw a conflict error.
- `[x]` **VOTE-API-007**: When a member attempts to nominate during "voting" or "decided" phase, the system SHALL throw a bad-request error.
- `[x]` **VOTE-DATA-001**: Each nomination shall have a unique (round_id, book_id) pair.

## Voting

- `[x]` **VOTE-API-008**: When a member calls `votes.submit`, the system SHALL accept a list of nomination_ids and replace all previous votes for that user in that round.
- `[x]` **VOTE-BE-003**: The system shall enforce that a member cannot approve more than `max_approvals_per_member` nominations in a single round.
- `[x]` **VOTE-UI-001**: While a round is in "voting" status, the system SHALL hide vote tallies from all members (only show whether the current user has voted).
- `[x]` **VOTE-UI-002**: When a round reaches "decided" status, the system SHALL display the full vote tallies and winner to all members.
- `[x]` **VOTE-UI-003**: During voting phase, the submit button SHALL display a live count of selections: "Submit N votes", disabled until at least one nomination is selected.
- `[x]` **VOTE-UI-004**: After submitting votes, the button SHALL change to "✓ Voted — update N?" to indicate the user can re-vote before the deadline if desired.
- `[x]` **VOTE-UI-005**: The voting sidebar SHALL display an approval-cap indicator showing used/remaining slots as filled and empty circles (e.g., ◉◉○ — "2 of 3 used").
- `[x]` **VOTE-DATA-002**: The system shall enforce one vote per (round_id, nomination_id, user_id) tuple.

## Voting UI — Decided Phase

- `[x]` **VOTE-UI-006**: On the decided screen, the winner shall display in a gradient banner card with book cover, title, author, vote count (N / total members), and two CTAs: "Set up first meeting" and "View on Open Library".
- `[x]` **VOTE-UI-007**: Below the winner, all nominations shall be ranked by vote count in a tally list with position indicators (①, 2️⃣, etc.), per-book progress bars (width = votes / winner_votes * 100%), and the winner's row tinted.

## Book Metadata

- `[x]` **VOTE-API-009**: The `books.search` procedure SHALL query the Open Library API and return results with title, author, cover URL, and page count.
- `[x]` **VOTE-BE-004**: The system shall cache book metadata locally after the first lookup to avoid repeated external API calls.
- `[x]` **VOTE-UI-003**: When the external book API is unavailable, the system SHALL allow manual entry of book title and author.

## Book Selection History

- `[x]` **VOTE-API-010**: The `selections.list` procedure SHALL return all books the club has read, ordered by selection date (most recent first).
- `[x]` **VOTE-BE-005**: When an admin creates a BookSelection without a voting round (direct pick), the system SHALL set it as the current book immediately.

## Notifications

- `[x]` **VOTE-NOTIFY-001**: When a round enters "nominating" status, the system SHALL notify all club members via email.
- `[x]` **VOTE-NOTIFY-002**: When a round enters "voting" status, the system SHALL notify all club members via email.
- `[x]` **VOTE-NOTIFY-003**: When a voting deadline is 24 hours away, the system SHALL notify members who have not yet voted.
- `[x]` **VOTE-NOTIFY-004**: When a round is decided, the system SHALL notify all club members with the winning book.

## Design UI (from prototype)

- `[x]` **VOTE-UI-004**: During nominating phase, the system SHALL display nomination cards showing book cover, pitch text, nominator name, and nomination date.
- `[x]` **VOTE-UI-005**: The "Search & nominate" button SHALL open a modal that queries the Open Library API and allows one-click nomination from results.
- `[x]` **VOTE-UI-006**: During nominating phase, admins SHALL see an "Advance to voting" button with a prerequisite indicator (minimum 2 nominations).
- `[x]` **VOTE-UI-007**: When a round is decided, the system SHALL display a winner banner with gradient background, total vote count, and "Set up first meeting" CTA.
- `[x]` **VOTE-UI-008**: Below the winner banner, the system SHALL display final tallies as a ranked list with proportional progress bars per nomination.
- `[x]` **VOTE-UI-009**: During voting phase, the sidebar SHALL show a visual approval bar ({N}/{max} filled dots) and voter turnout count with "tallies hidden" message.
- `[x]` **VOTE-UI-010**: After submitting votes, the button SHALL change to "Voted — update {N}?" allowing re-vote until round closes.

## Deferred

- `[D]` **VOTE-BE-006**: The system shall enforce a maximum number of nominations per member per round.
- `[D]` **VOTE-UI-004**: The system shall display reading history analytics (genre distribution, author diversity).
- `[D]` **VOTE-UI-005**: Members shall be able to flag a nomination as "already read" to signal the group.
