# Reading Progress Specs

**LLD**: docs/llds/reading-progress.md
**Implementing artifacts**:
- API: `src/server/routers/progress.ts`, `src/server/routers/books.ts` (`listForClub`)
- UI: `src/app/clubs/[clubId]/progress/page.tsx`, `update-modal.tsx`
- Tests: `tests/integration/progress.test.ts`, `tests/e2e/progress-*.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Update Modal Status States

State: not_started — page input behavior: forced to 0 on status change — chapter input: editable but cleared on auto-set
State: reading — page input behavior: editable, range 0..totalPages — chapter input: editable
State: finished — page input behavior: forced to totalPages on status change AND disabled — chapter input: editable
Auto-transitions: page input change from 0→positive while status="not_started" auto-bumps status to "reading" (`update-modal.tsx:151-156`)

## Book Selection & Navigation

- `[x]` **PROG-UI-BOOK-001**: When a member navigates to `/clubs/[clubId]/progress` with no `bookId`, the system SHALL render the dashboard for the club's current `BookSelection` (`isCurrent: true`); if no selection exists at all, SHALL render an empty state "No books have been selected yet." (supersedes the prior "book grid" behavior).
- `[x]` **PROG-UI-BOOK-002**: The progress page SHALL accept a `?bookId=` query parameter and show the dashboard for that book when provided.
- `[D]` **PROG-UI-BOOK-003**: Deferred — replaced by the inline history picker (PROG-UI-BOOK-005..007). No standalone book grid page.
- `[D]` **PROG-UI-BOOK-004**: Deferred — no separate selector page to return to; the picker is always inline.
- `[x]` **PROG-API-006**: The `books.listForClub` procedure SHALL return all books that have been selected for a given club, ordered by most recently selected first. Visible to all members.
- `[x]` **PROG-UI-BOOK-005**: The progress dashboard SHALL render an inline history picker listing the club's `BookSelection` rows, with the current selection (`isCurrent: true`) first, followed by past selections ordered by `selectedAt` DESC.
- `[x]` **PROG-UI-BOOK-006**: Each entry in the history picker SHALL be a Link navigating to `/clubs/[clubId]/progress?bookId={bookId}`. Past entries display live `ReadingProgress` for that book (no snapshotting).
- `[x]` **PROG-UI-BOOK-007**: The current selection in the history picker SHALL be marked with a "Current" badge; past selections SHALL NOT show the badge.
- `[x]` **PROG-UI-BOOK-008**: Each past entry in the history picker SHALL display the finished date as "Finished {MMM YYYY}", computed from `BookSelection.finishedAt`. If `finishedAt` is null, the entry SHALL fall back to `selectedAt` and label it "Selected {MMM YYYY}".

## Progress Data Model & API

- `[x]` **PROG-DATA-001**: The system SHALL enforce one progress record per `(clubId, bookId, userId)` via a unique constraint.
- `[x]` **PROG-API-001**: The `progress.update` procedure SHALL upsert (create or update) the record (idempotent).
- `[x]` **PROG-API-002**: The `progress.update` procedure SHALL accept any subset of fields (`currentPage`, `percentage`, `currentChapter`, `status`) and update only the provided fields, leaving others unchanged.
- `[x]` **PROG-API-003**: The `progress.list` procedure SHALL return all members' progress records for `(clubId, bookId)`, including user data, sorted by percentage DESC. Visible to all members.
- `[x]` **PROG-API-004**: The `progress.me` procedure SHALL return the current user's progress for `(clubId, bookId)`, or null if no record exists.
- `[x]` **PROG-API-005**: The `progress.summary` procedure SHALL return aggregate stats: median percentage, count by status (finished/reading/not_started), and a chapter distribution map.

## Progress Computation

- `[x]` **PROG-BE-001**: When `currentPage` and `totalPages` are known, percentage = `round(currentPage / totalPages * 100)`.
- `[x]` **PROG-BE-002**: When `percentage` and `totalPages` are known, currentPage = `round(percentage / 100 * totalPages)`.
- `[x]` **PROG-BE-003**: When `totalPages` is null, the system SHALL accept percentage input but leave `currentPage` null.
- `[x]` **PROG-BE-004**: `totalPages` is determined by `Book.pageCount`. If unavailable, defaults to null.
- `[x]` **PROG-BE-005**: Status enum: "not_started", "reading", "finished".
- `[x]` **PROG-BE-006**: When status="finished", percentage forced to 100; currentPage forced to totalPages (if known).
- `[x]` **PROG-BE-007**: When status="not_started" via the modal, currentPage SHALL be reset to 0 (modal-side; API itself does not coerce). (`update-modal.tsx:62-66`)

## Progress Update UI — Modal

- `[x]` **PROG-UI-MODAL-OPEN-001**: Button: "Update My Progress" (`update-modal.tsx:24-30`) is rendered on the progress dashboard. Click opens the modal.
- `[x]` **PROG-UI-001**: The modal SHALL display three large radio-card buttons for status: "Not Started", "Reading", "Finished" (`update-modal.tsx:118-139`). Selected state uses primary border + soft background.
- `[x]` **PROG-UI-MODAL-PAGE-001**: Number input for "Current Page", min 0, max totalPages. Disabled when status="finished" (`update-modal.tsx:142-164`). When user enters a positive value while status="not_started", status auto-changes to "reading".
- `[!]` **PROG-UI-002**: Older spec required a range slider synchronized with the page number input. **Slider not implemented**; only the number input exists. Treat as gap:
  - `[ ]` **PROG-UI-MODAL-SLIDER-001**: Range slider input (HTML `<input type="range">`) bidirectionally synced with the page number input.
- `[x]` **PROG-UI-003**: When status="finished", the page input auto-locks to totalPages and is disabled. (`update-modal.tsx:62-63, 157`)
- `[x]` **PROG-UI-004**: When status="not_started", the page input resets to 0. Chapter input is not auto-cleared. (`update-modal.tsx:64-66`)
- `[!]` **PROG-UI-MODAL-PCT-001**: The modal shows a read-only "Progress: {N}%" display computed live (`update-modal.tsx:167-175`). Older spec described an editable percentage input — **not implemented**:
  - `[ ]` **PROG-UI-MODAL-PCT-EDIT-001**: Editable percentage number input (0–100), bidirectionally synced with page input.
- `[x]` **PROG-UI-006**: The modal SHALL include an optional numeric "Chapter (optional)" input (`update-modal.tsx:178-191`), placeholder "—".
- `[x]` **PROG-UI-007**: Buttons: "Cancel" (`update-modal.tsx:201-203`) and "Save Progress" (`update-modal.tsx:204-212`) at the bottom. Save calls `progress.update` and refreshes the route on success.

## Progress Update UI — Gaps

- `[!]` **PROG-UI-005**: Older spec required a live preview progress bar in the modal. **Not implemented**; only the read-only "Progress: {N}%" text exists.
  - `[ ]` **PROG-UI-MODAL-PREVIEW-001**: Animated live preview progress bar showing status-class fill color and percentage.
- `[x]` **PROG-UI-008** & **PROG-UI-009**: Implemented via the toast/undo pair below.
  - `[x]` **PROG-UI-MODAL-TOAST-001**: After a successful `progress.update`, the modal SHALL close and a toast SHALL appear at the bottom of the viewport reading "Progress saved · page {N}" (where N is the saved page; "Progress saved" alone if `totalPages` is null). The toast SHALL auto-dismiss after 4 seconds. `data-testid="progress-saved-toast"`.
  - `[x]` **PROG-UI-MODAL-UNDO-001**: The toast SHALL include an "Undo" button (`data-testid="progress-undo-btn"`). Clicking Undo SHALL (a) re-issue `progress.update` with the previous values captured before save, (b) dismiss the toast, (c) re-open the modal pre-filled with the previous values, and (d) refresh the dashboard so the reverted state is visible. If there were no previous values (no prior progress record), the toast SHALL omit the Undo button.
- `[ ]` **PROG-UI-MODAL-TIMESTAMP-001**: "Last updated" timestamp shown below modal body.

## Progress Dashboard Display

- `[x]` **PROG-UI-DASH-001**: Header SHALL display the page title and the "Update My Progress" button.
- `[x]` **PROG-UI-DASH-002**: When no progress records exist for a book, the system SHALL display an empty state.
- `[x]` **PROG-UI-DASH-003**: A summary card SHALL display an SVG animated progress ring showing the club's median reading percentage.
- `[x]` **PROG-UI-DASH-004**: The progress ring animates via stroke-dasharray/stroke-dashoffset (≈1s cubic-bezier, 500ms ease-out variant for staggered rows).
- `[x]` **PROG-UI-DASH-005**: Two ring sizes: full (130px / 12px stroke) and compact (64px / 7px stroke).
- `[x]` **PROG-UI-DASH-006**: Below the ring, a horizontal segmented bar SHALL show finished (accent), reading (primary), not_started (ink-4) proportions; height 8px.
- `[x]` **PROG-UI-DASH-007**: A legend below the distribution bar SHALL show colored square dots and "Finished [N]", "Reading [N]", "Not started [N]".
- `[x]` **PROG-UI-DASH-008**: The member list SHALL be titled "Where everyone is" with subtitle "Sorted by progress".
- `[x]` **PROG-UI-DASH-009**: Each member row SHALL display: avatar, name, status/page info, animated progress bar, right-aligned percentage, status badge.
- `[x]` **PROG-UI-DASH-010**: Member-list bars SHALL animate with a staggered ~60ms delay per row, 500ms duration, ease-out.
- `[x]` **PROG-UI-DASH-011**: Status badge: "Done" (accent), "Reading" (primary + dot), "Waiting" (neutral).
- `[x]` **PROG-UI-DASH-012**: Members with status="finished" SHALL display a gold checkmark next to the name.
- `[x]` **PROG-UI-DASH-013**: Per-member info line:
  - "Not started yet" (status="not_started")
  - "Finished · [totalPages] pages" (status="finished")
  - "Page [currentPage][optional · ch. [currentChapter]]" (status="reading")
- `[x]` **PROG-UI-DASH-014**: A compact dashboard card variant (360px width, small ring, mini distribution bar) is used as a read-only preview on the main club dashboard.

## Spoiler Integration

- `[D]` **PROG-BE-SPOOF-001**: Superseded by `DISC-UI-PROGRESS-AUTOFILTER-001`/`002` and `DISC-UI-DASH-FEED-AUTOFILTER-001` in `docs/specs/disc-specs.md`. The cutoff helper lives at `src/lib/discussions/spoiler-cutoff.ts` (`DISC-LIB-CUTOFF-001`).
- `[D]` **PROG-UI-SPOOF-001**: Superseded — the discussions page prefills the existing `max-chapter-input` from the viewer's progress and surfaces the existing `hidden-count` chip. See `DISC-UI-PROGRESS-AUTOFILTER-001`.

## Error Handling

- `[x]` **PROG-ERR-001**: If `progress.update` fails, the modal SHALL display the error message inline (`update-modal.tsx:193-197`).
- `[ ]` **PROG-ERR-002**: If loading the progress list fails, the page SHALL display the specific error.
- `[ ]` **PROG-ERR-003**: If the user lacks membership, the procedure SHALL return a 403 (handled at middleware level — verify in tests).

## Deferred

- `[D]` **PROG-BE-AUDIO-001**: Audiobook progress in hours:minutes.
- `[D]` **PROG-NOTIFY-001**: Reminder email after 2+ weeks without a progress update.
- `[D]` **PROG-BE-HISTORY-001**: Historical progress updates with timestamps for reading-velocity analytics.
- `[D]` **PROG-UI-GOAL-001**: Per-member reading goals with goal-progress visualization.
