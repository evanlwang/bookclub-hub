# Reading Progress Specs

**LLD**: docs/llds/reading-progress.md
**Implementing artifacts**: 
- API: `src/server/routers/progress.ts`, `src/server/routers/books.ts` (listForClub procedure)
- UI: `src/app/clubs/[clubId]/progress/page.tsx`, `update-modal.tsx`
- Tests: `tests/integration/progress.test.ts`, `tests/e2e/progress-*.spec.ts`, `tests/e2e/progress-book-selector.spec.ts`

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Book Selection & Navigation

- `[x]` **PROG-UI-BOOK-001**: When a member navigates to `/clubs/[clubId]/progress` with no bookId query param, the system SHALL display either a book grid for selection or a message "No books have been selected yet."
- `[x]` **PROG-UI-BOOK-002**: The progress page SHALL accept a `?bookId=` query parameter and show the dashboard for that book when provided.
- `[x]` **PROG-UI-BOOK-003**: Each book in the selector grid is a clickable Link that navigates to the progress dashboard with the appropriate bookId for the selected book.
- `[x]` **PROG-API-006**: The `books.listForClub` procedure SHALL return all books that have been selected for a given club, ordered by most recently selected first. This is visible to all club members.

## Progress Data Model & API

- `[x]` **PROG-DATA-001**: The system SHALL enforce one progress record per (club_id, book_id, user_id) tuple via a database unique constraint.
- `[x]` **PROG-API-001**: The `progress.update` procedure SHALL create a new progress record if none exists, or update an existing one (idempotent upsert).
- `[x]` **PROG-API-002**: The `progress.update` procedure SHALL accept any subset of fields (currentPage, percentage, currentChapter, status) and update only the provided fields, leaving others unchanged.
- `[x]` **PROG-API-003**: The `progress.list` procedure SHALL return a list of all progress records for a given (clubId, bookId), including user data, sorted by percentage descending. This list is visible to all club members.
- `[x]` **PROG-API-004**: The `progress.me` procedure SHALL return the current user's progress record for a given (clubId, bookId), or null if no record exists.
- `[x]` **PROG-API-005**: The `progress.summary` procedure SHALL return aggregate statistics: median percentage, count by status (finished/reading/not_started), and a chapter distribution map. This is visible to all club members.

## Progress Computation

- `[x]` **PROG-BE-001**: When a member updates currentPage and totalPages is known, the system SHALL compute percentage as `round(currentPage / totalPages * 100)`.
- `[x]` **PROG-BE-002**: When a member updates percentage and totalPages is known, the system SHALL compute currentPage as `round(percentage / 100 * totalPages)`.
- `[x]` **PROG-BE-003**: When totalPages is not known (null), the system SHALL accept percentage input but leave currentPage null.
- `[x]` **PROG-BE-004**: The totalPages value is determined by the Book.pageCount in the database. If not available, it defaults to null.
- `[x]` **PROG-BE-005**: Progress status is an enum with three values: "not_started", "reading", "finished".
- `[x]` **PROG-BE-006**: When a member sets status to "finished", the system SHALL set percentage to 100 and currentPage to totalPages (if totalPages is known).
- `[x]` **PROG-BE-007**: When a member sets status to "not_started", the system SHALL keep currentPage and percentage at their current values (no auto-reset).

## Progress Update UI

- `[x]` **PROG-UI-001**: The progress update modal SHALL include three status option buttons (Not Started / Reading / Finished) displayed as mutually exclusive card buttons.
- `[x]` **PROG-UI-002**: The progress update modal SHALL include a numeric input field for current page, labeled "Current Page", with min=0 and max=totalPages.
- `[x]` **PROG-UI-003**: When the user enters a page number > 0 and status is "not_started", the system SHALL automatically change status to "reading".
- `[x]` **PROG-UI-004**: When status is set to "finished", the page input SHALL be disabled and the page value SHALL be set to totalPages.
- `[x]` **PROG-UI-005**: The progress update modal SHALL display a read-only percentage display field showing the computed percentage based on the page input and totalPages.
- `[x]` **PROG-UI-006**: The progress update modal SHALL include an optional numeric input field for current chapter, labeled "Chapter (optional)".
- `[x]` **PROG-UI-007**: The update modal SHALL include Cancel and Save Progress buttons at the bottom.
- `[x]` **PROG-UI-008**: On successful save, the modal SHALL close and the page SHALL refresh to show updated progress.
- `[ ]` **PROG-UI-009**: The progress update modal SHALL include a range slider input for page number in addition to the numeric input field (allows quicker approximate updates).

## Progress Dashboard Display

- `[x]` **PROG-UI-DASH-001**: The progress dashboard header SHALL display the title "Reading Progress" and an "Update My Progress" button.
- `[x]` **PROG-UI-DASH-002**: When no progress records exist for a book, the system SHALL display a card with the message "No progress tracked yet."
- `[x]` **PROG-UI-DASH-003**: The dashboard SHALL display a summary card with a circular SVG ring chart showing the club's median reading percentage as a filled ring (blue) against an unfilled background (light gray).
- `[x]` **PROG-UI-DASH-004**: Inside the ring chart, the median percentage value SHALL be displayed as a large number.
- `[x]` **PROG-UI-DASH-005**: Below the ring, a horizontal segmented bar SHALL show the proportions of members by status: finished (gold), reading (blue), not_started (gray). The bar height is 12px (h-3).
- `[x]` **PROG-UI-DASH-006**: A legend below the distribution bar SHALL show label and count for each status: "Finished [N]", "Reading [N]", "Not started [N]".
- `[x]` **PROG-UI-DASH-007**: The summary text SHALL read: "[reading + finished] of [total] reading · median at [median]% · [finished] finished" (with the "finished" part omitted if count is 0).
- `[x]` **PROG-UI-DASH-008**: The member list SHALL be titled "Where everyone is" with a subtitle "Sorted by progress".
- `[x]` **PROG-UI-DASH-009**: Each member progress row SHALL display: avatar, name, status/page info, an animated progress bar, percentage in right-aligned large text, and a status badge.
- `[x]` **PROG-UI-DASH-010**: Progress bars SHALL animate with a staggered 60ms delay per row (duration 500ms, easing ease-out).
- `[x]` **PROG-UI-DASH-011**: The status badge SHALL show one of: "Done" (gold), "Reading" (blue with dot), or "Waiting" (gray), matching the member's progress status.
- `[x]` **PROG-UI-DASH-012**: For members with status "finished", a gold checkmark icon SHALL appear next to the name (inside a small circular background).
- `[x]` **PROG-UI-DASH-013**: The page/chapter info line for each member SHALL display:
  - If "not_started": "Not started yet"
  - If "finished": "Finished · [totalPages] pages"
  - If "reading": "Page [currentPage][optional · ch. [currentChapter]]"

## Spoiler Integration

- `[ ]` **PROG-BE-SPOOF-001**: When filtering discussion threads by maxChapter, the system SHALL use the current user's currentChapter value from their progress record as the default filter (if a record exists and currentChapter is set).
- `[ ]` **PROG-UI-SPOOF-001**: On the discussion thread list, a note or indicator SHALL show the current chapter filter: "Showing discussions up to chapter [N]" or "Showing all discussions (no spoiler filter)".

## Error Handling

- `[ ]` **PROG-ERR-001**: If a progress update fails due to database error, the modal SHALL display an error message: "Failed to save" or a more specific error returned by the API.
- `[ ]` **PROG-ERR-002**: If loading the progress list fails, the page SHALL display an error message with the specific error text.
- `[ ]` **PROG-ERR-003**: If the user lacks membership in the specified club, the system SHALL return a 403 Unauthorized error from the tRPC procedure.

## Deferred

- `[D]` **PROG-BE-AUDIO-001**: The system shall support audiobook progress measured in hours:minutes format (e.g., "2:15") in addition to page-based progress.
- `[D]` **PROG-NOTIFY-001**: The system shall send a gentle reminder email to members who haven't updated progress in 2+ weeks (opt-in only).
- `[D]` **PROG-BE-HISTORY-001**: The system shall track historical progress updates with timestamps to compute reading velocity (e.g., "50 pages/week on average").
- `[D]` **PROG-UI-GOAL-001**: Each member SHALL be able to set a reading goal (e.g., "finish by May 10") and the dashboard SHALL show progress toward that goal.
