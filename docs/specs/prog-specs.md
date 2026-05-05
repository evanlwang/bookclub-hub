# Reading Progress Specs

**LLD**: docs/llds/reading-progress.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Progress Tracking

- `[x]` **PROG-API-001**: When a member calls `progress.update`, the system SHALL create the progress record if it doesn't exist, or update it if it does (idempotent upsert).
- `[x]` **PROG-API-002**: The `progress.update` procedure SHALL accept any subset of fields (current_page, percentage, current_chapter, status) and update only the provided fields.
- `[x]` **PROG-DATA-001**: The system shall enforce one progress record per (club_id, book_id, user_id) tuple.
- `[x]` **PROG-BE-001**: When a member updates current_page and total_pages is known, the system SHALL compute percentage as `round(current_page / total_pages * 100)`.
- `[ ]` **PROG-BE-002**: When a member updates percentage and total_pages is known, the system SHALL compute current_page as `round(percentage / 100 * total_pages)`.
- `[ ]` **PROG-BE-003**: When total_pages is not known (null), the system SHALL accept percentage input only and leave current_page null.

## Progress Visibility

- `[x]` **PROG-API-003**: The `progress.list` procedure SHALL return individual progress for every club member, visible to all members of the club.
- `[ ]` **PROG-API-004**: The `progress.summary` procedure SHALL return aggregate statistics: median percentage, count by status (finished, reading, not_started), and chapter distribution.
- `[x]` **PROG-UI-001**: The club progress dashboard SHALL display a progress bar for each member, sorted by percentage (highest first).
- `[ ]` **PROG-UI-002**: Members with status "not_started" shall be listed separately below the progress bars.

## Spoiler Integration

- `[ ]` **PROG-BE-004**: The current_chapter field from a user's progress record SHALL be used as the default `maxChapter` filter for discussion thread queries.
- `[ ]` **PROG-UI-003**: The progress update form SHALL include a separate field for current_chapter (not derived from page number).

## Status

- `[x]` **PROG-BE-005**: Progress status shall be one of: "not_started", "reading", "finished".
- `[x]` **PROG-BE-006**: When a member sets status to "finished", the system SHALL set percentage to 100 and current_page to total_pages (if known).

## Design UI (from prototype)

- `[ ]` **PROG-UI-004**: The progress dashboard SHALL display an SVG ring chart showing the club's median reading percentage.
- `[ ]` **PROG-UI-005**: Below the ring, a segmented distribution bar SHALL show proportions of finished/reading/not_started members with a color legend.
- `[ ]` **PROG-UI-006**: Individual member progress bars SHALL animate with a staggered 60ms delay (500ms ease-out fill).
- `[ ]` **PROG-UI-007**: Each member row SHALL display a status badge (Done/Reading/Waiting) with appropriate color tone.
- `[ ]` **PROG-UI-008**: Finished members SHALL show a gold checkmark indicator next to their name.
- `[ ]` **PROG-UI-009**: The update modal SHALL include a range slider for page input (in addition to the number field).

## Deferred

- `[D]` **PROG-BE-007**: The system shall support audiobook progress in hours:minutes format alongside page-based progress.
- `[D]` **PROG-NOTIFY-001**: The system shall send a gentle reminder to members who haven't updated progress in 2+ weeks (opt-in only).
- `[D]` **PROG-BE-008**: The system shall track historical progress updates to compute reading pace over time.
