# Reading Progress Specs

**LLD**: docs/llds/reading-progress.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Progress Tracking

- `[ ]` **PROG-API-001**: When a member PUTs to `/progress/me`, the system SHALL create the progress record if it doesn't exist, or update it if it does (idempotent upsert).
- `[ ]` **PROG-API-002**: The PUT endpoint SHALL accept any subset of fields (current_page, percentage, current_chapter, status) and update only the provided fields.
- `[ ]` **PROG-DATA-001**: The system shall enforce one progress record per (club_id, book_id, user_id) tuple.
- `[ ]` **PROG-BE-001**: When a member updates current_page and total_pages is known, the system SHALL compute percentage as `round(current_page / total_pages * 100)`.
- `[ ]` **PROG-BE-002**: When a member updates percentage and total_pages is known, the system SHALL compute current_page as `round(percentage / 100 * total_pages)`.
- `[ ]` **PROG-BE-003**: When total_pages is not known (null), the system SHALL accept percentage input only and leave current_page null.

## Progress Visibility

- `[ ]` **PROG-API-003**: The `/progress` endpoint (all members) SHALL return individual progress for every club member, visible to all members of the club.
- `[ ]` **PROG-API-004**: The `/progress/summary` endpoint SHALL return aggregate statistics: median percentage, count by status (finished, reading, not_started), and chapter distribution.
- `[ ]` **PROG-UI-001**: The club progress dashboard SHALL display a progress bar for each member, sorted by percentage (highest first).
- `[ ]` **PROG-UI-002**: Members with status "not_started" shall be listed separately below the progress bars.

## Spoiler Integration

- `[ ]` **PROG-BE-004**: The current_chapter field from a user's progress record SHALL be used as the default `max_chapter` filter for discussion thread queries.
- `[ ]` **PROG-UI-003**: The progress update form SHALL include a separate field for current_chapter (not derived from page number).

## Status

- `[ ]` **PROG-BE-005**: Progress status shall be one of: "not_started", "reading", "finished".
- `[ ]` **PROG-BE-006**: When a member sets status to "finished", the system SHALL set percentage to 100 and current_page to total_pages (if known).

## Deferred

- `[D]` **PROG-BE-007**: The system shall support audiobook progress in hours:minutes format alongside page-based progress.
- `[D]` **PROG-NOTIFY-001**: The system shall send a gentle reminder to members who haven't updated progress in 2+ weeks (opt-in only).
- `[D]` **PROG-BE-008**: The system shall track historical progress updates to compute reading pace over time.
