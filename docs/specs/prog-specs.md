# Reading Progress Specs

**LLD**: docs/llds/reading-progress.md
**Implementing artifacts**:
- API: `src/server/routers/progress.ts`, `src/server/routers/books.ts` (`listForClub`)
- UI: `src/app/clubs/[clubId]/progress/page.tsx` (RSC), `progress-dashboard.tsx`, `update-modal.tsx`
- Tests: `tests/integration/progress.test.ts`, `tests/e2e/progress-*.spec.ts`, `tests/unit/app/progress-optimistic.test.tsx`, `tests/e2e/live-updates.spec.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Update Modal Status States

State: not_started — page input behavior: forced to 0 on status change — chapter input: editable but cleared on auto-set
State: reading — page input behavior: editable, range 0..totalPages — chapter input: editable
State: finished — page input behavior: forced to totalPages on status change AND disabled — chapter input: editable
Auto-transitions: page input change from 0→positive while status="not_started" auto-bumps status to "reading" (`update-modal.tsx:218-220`)

## Book Selection & Navigation

- `[x]` **PROG-UI-BOOK-001**: When a member navigates to `/clubs/[clubId]/progress` with no `bookId`, the system SHALL render the dashboard for the club's current `BookSelection` (`isCurrent: true`); if no selection exists at all, SHALL render an empty state "No books have been selected yet." (supersedes the prior "book grid" behavior).
- `[x]` **PROG-UI-BOOK-002**: The progress page SHALL accept a `?bookId=` query parameter and show the dashboard for that book when provided.
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

## Input Validation

- `[x]` **PROG-API-VALID-001**: When `totalPages` is known (either provided in the request or resolvable from `existing.totalPages` or `Book.pageCount`), `progress.update` SHALL reject `currentPage > totalPages` with `TRPCError({ code: "BAD_REQUEST" })`. When `totalPages` is null, any non-negative `currentPage` is accepted. Prevents stored percentages > 100 leaking onto the dashboard. (`progress.ts`)
- `[x]` **PROG-UI-MODAL-PAGE-CLAMP-001**: The modal SHALL clamp client-side `currentPage` changes to `[0, totalPages]` (when known) or `[0, ∞)` (when null) before calling the mutation. NaN inputs SHALL coerce to 0. Fractional inputs SHALL floor. Mirrors PROG-API-VALID-001 so the UI never displays a state the server would reject. (`clamp-page.ts`, `update-modal.tsx`)
- `[x]` **PROG-DASH-UNKNOWN-TOTAL-001**: When the book has no known page count (`Book.pageCount` null AND no member record carries `totalPages`), the dashboard SHALL pass `null` to `UpdateProgressButton` (no fabricated fallback). The modal SHALL hide the page slider, omit the `max` attribute on the page input, and render "Unknown total — record page only" beneath the input. (`progress/page.tsx`, `update-modal.tsx`)

## Progress Computation

- `[x]` **PROG-BE-001**: When `currentPage` and `totalPages` are known, percentage = `round(currentPage / totalPages * 100)`.
- `[x]` **PROG-BE-002**: When `percentage` and `totalPages` are known, currentPage = `round(percentage / 100 * totalPages)`.
- `[x]` **PROG-BE-003**: When `totalPages` is null, the system SHALL accept percentage input but leave `currentPage` null.
- `[x]` **PROG-BE-004**: `totalPages` is determined by `Book.pageCount`. If unavailable, defaults to null.
- `[x]` **PROG-BE-005**: Status enum: "not_started", "reading", "finished".
- `[x]` **PROG-BE-006**: When status="finished", percentage forced to 100; currentPage forced to totalPages (if known).
- `[x]` **PROG-BE-006-AUTOFINISH**: When `totalPages` is known and the computed `percentage` reaches 100 (via `currentPage===totalPages` or explicit `percentage=100`), `computeProgress` SHALL promote `status` from "reading" to "finished". Symmetric pair to PROG-BE-006 — the 100% state and the "finished" state are equivalent, so the dashboard and modal render a single, consistent visual. When `totalPages` is null, status is left untouched (no denominator means percentage=100 is a user-supplied claim). (`compute.ts`)
- `[x]` **PROG-BE-007**: When status="not_started" via the modal, currentPage SHALL be reset to 0 (modal-side; API itself does not coerce). (`update-modal.tsx:209-211`)

## Progress Update UI — Modal

- `[x]` **PROG-UI-MODAL-OPEN-001**: Button: "Move my bookmark" (`update-modal.tsx:140-150`) is rendered on the progress dashboard. Click opens the modal.
- `[x]` **PROG-UI-001**: The modal SHALL display three large radio-card buttons for status: "Not started", "Reading", "Finished" (`update-modal.tsx:292-325`). Selected state uses primary border + soft background.
- `[x]` **PROG-UI-MODAL-PAGE-001**: Number input labeled "Page", min 0, max totalPages. Disabled when status="finished" (`update-modal.tsx:348-357`). When user enters a positive value while status="not_started", status auto-changes to "reading".
- `[x]` **PROG-UI-002**: Implemented via PROG-UI-MODAL-SLIDER-001 below.
  - `[x]` **PROG-UI-MODAL-SLIDER-001**: The modal SHALL render a range slider (`<input type="range">`, `data-testid="page-slider"`, min 0, max totalPages) bidirectionally synced with the page number input. Changing the slider SHALL update the page input; changing the page input SHALL update the slider. The slider SHALL be disabled when status="finished". Moving the slider from 0 → positive while status="not_started" SHALL auto-bump status to "reading" (same behavior as the page input).
- `[x]` **PROG-UI-003**: When status="finished", the page input auto-locks to totalPages and is disabled. (`update-modal.tsx:207-208, 354`)
- `[x]` **PROG-UI-004**: When status="not_started", the page input resets to 0. Chapter input is not auto-cleared. (`update-modal.tsx:209-211`)
- `[x]` **PROG-UI-MODAL-PCT-001**: The modal SHALL render the percentage as a read-only visual: a "Progress: {N}%" header and a `<ProgressBar>` filled to that percentage, inside a `data-testid="progress-preview-bar"` container that exposes `data-percentage` and `data-status` attributes for tests. The percentage is derived live from `page / totalPages` (or 100 when status="finished") and is not directly editable — users adjust the page input or the slider, and the bar follows.
- `[x]` **PROG-UI-006**: The modal SHALL include an optional numeric "Chapter (optional)" input (`update-modal.tsx:374-386`), placeholder "—".
- `[x]` **PROG-UI-007**: Buttons: "Cancel" (`update-modal.tsx:427-429`) and "Save my place" (`update-modal.tsx:430-439`) at the bottom. Save calls `progress.update` optimistically (cache write + rollback, PROG-UI-OPTIMISTIC-001); no route refresh.

## Progress Update UI — Gaps

- `[x]` **PROG-UI-005**: Implemented via PROG-UI-MODAL-PREVIEW-001 below.
  - `[x]` **PROG-UI-MODAL-PREVIEW-001**: The modal SHALL render an animated live preview progress bar (`data-testid="progress-preview-bar"`) above the percentage label. Width SHALL match the live computed percentage; fill color SHALL match the status (`not_started`=ink-4, `reading`=primary, `finished`=accent). The wrapper SHALL expose `data-percentage="{N}"` and `data-status="{status}"` so tests can assert state without scraping CSS.
- `[x]` **PROG-UI-008** & **PROG-UI-009**: Implemented via the toast/undo pair below.
  - `[x]` **PROG-UI-MODAL-TOAST-001**: After a successful `progress.update`, the modal SHALL close and a toast SHALL appear at the bottom of the viewport reading "Progress saved · page {N}" (where N is the saved page; "Progress saved" alone if `totalPages` is null). The toast SHALL auto-dismiss after 4 seconds. `data-testid="progress-saved-toast"`.
  - `[x]` **PROG-UI-MODAL-UNDO-001**: The toast SHALL include an "Undo" button (`data-testid="progress-undo-btn"`). Clicking Undo SHALL (a) re-issue `progress.update` with the previous values captured before save, (b) dismiss the toast, (c) re-open the modal pre-filled with the previous values, and (d) refresh the dashboard so the reverted state is visible. If there were no previous values (no prior progress record), the toast SHALL omit the Undo button.
- `[x]` **PROG-UI-MODAL-TIMESTAMP-001**: When the user has an existing progress record (`currentProgress.updatedAt` set), the modal SHALL display "Last updated {MMM D, YYYY · h:mm A}" (en-US locale, hardcoded for test determinism) below the chapter input. `data-testid="last-updated"`. Hidden when no prior record (first-time update).

## Progress Dashboard Display

- `[x]` **PROG-UI-DASH-001**: Header SHALL display the page title and the "Move my bookmark" button.
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
  - "Finished · [totalPages ?? currentPage] pages" (status="finished"; falls back to currentPage, then empty, when totalPages is unknown)
  - "Page [currentPage][optional · ch. [currentChapter]]" (status="reading")
- `[x]` **PROG-UI-DASH-014**: A compact dashboard card variant (360px width, small ring, mini distribution bar) is used as a read-only preview on the main club dashboard.
- `[x]` **PROG-DASH-MEDIAN-001**: The dashboard median percentage SHALL be computed over members whose `status !== "not_started"` only. The summary line SHALL read "median {N}% across {K} reading" and append "· {M} not started" and "· {F} finished" when those counts are positive. When zero members have started, the line SHALL read "No one has started yet". Excluding zeros for not-started members prevents the median from being dragged down mid-cycle. (`progress/page.tsx`, `median.ts`)
- `[x]` **PROG-DASH-UPDATED-001**: Each member row in "Where everyone is" SHALL render a `<time>` element showing "Updated Xd ago" (m/h/d/w resolution; "just now" under a minute) using `ReadingProgress.updatedAt`. Hidden for `status="not_started"` members (no meaningful update). `dateTime` attribute is the ISO timestamp; the `title` attribute shows the absolute date for hover. `data-testid="progress-updated-{userId}"`. (`progress/page.tsx`, `relative-time.ts`)

## Live Updates (mechanism: docs/llds/live-updates.md)

- `[x]` **PROG-DASH-LIVE-001**: WHILE a member is viewing the progress dashboard, other members' progress rows and the aggregate summary SHALL refresh within 60s via a polled `progress.list` query — without a reload. Row animations SHALL NOT replay on background refetches (stable keys, in-place swaps).
- `[x]` **PROG-UI-OPTIMISTIC-001**: WHEN the viewer saves progress from the update modal, their own dashboard row SHALL reflect the new values immediately via an `onMutate` write to the `progress.list` cache (the viewer's row is updated in place, or appended when no prior record exists). IF the mutation fails, the prior `progress.list` snapshot SHALL be restored and the modal's existing inline error shown (PROG-ERR-001). On `onSettled` both `progress.list` and `progress.me` SHALL be invalidated to reconcile with the server (the `progress.me` cache is not rewritten in `onMutate`). The undo-toast contract (PROG-UI-MODAL-UNDO-001) is unchanged.

## Error Handling

- `[x]` **PROG-ERR-001**: If `progress.update` fails, the modal SHALL display the error message inline (`update-modal.tsx:420-424`).
- `[x]` **PROG-ERR-002**: If loading the progress data fails (`selections.list`, `progress.list`, `progress.me`, or book lookup), the page SHALL render the error's `.message` via `data-testid="selections-error"` or `data-testid="progress-error"` (`progress/page.tsx:28-34, 79-81`). Verified end-to-end by the non-member test below.
- `[x]` **PROG-ERR-003**: Non-members SHALL receive `FORBIDDEN` ("Not a club member") from `progress.list`/`progress.me`/`progress.update`/`selections.list`. Enforced by `memberProcedure` middleware (`src/server/trpc.ts:27-42`); covered by `tests/e2e/progress-membership-403.spec.ts`.
