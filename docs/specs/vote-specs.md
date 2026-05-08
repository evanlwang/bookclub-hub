# Book Selection and Voting Specs

**LLD**: docs/llds/book-selection-and-voting.md
**Implementing artifacts**:
- API: `src/server/routers/rounds.ts`, `votes.ts`, `nominations.ts`, `books.ts`, `selections.ts`
- UI: `src/app/clubs/[clubId]/vote/page.tsx`, `vote-round.tsx`, `nominate-modal.tsx`
- Tests: `tests/integration/voting-lifecycle.test.ts`, `tests/integration/vote-persistence.test.ts`, `tests/integration/books.test.ts`, `tests/integration/books-manual.test.ts`, `tests/integration/cron-deadline-reminder.test.ts`, `tests/e2e/vote-persistence.spec.ts`, `tests/e2e/vote-submission.spec.ts`, `tests/e2e/voting-close.spec.ts`, `tests/e2e/voting-phases.spec.ts`, `tests/e2e/voting-round.spec.ts`, `tests/e2e/voting-sidebar.spec.ts`, `tests/unit/voting/tally.test.ts`, `tests/unit/voting-persistence.test.ts`

Status markers: `[x]` implemented · `[ ]` gap (not yet built) · `[D]` deferred · `[!]` divergence (built but differs from prior spec text)

---

## Voting Round Lifecycle

State: nominating — buttons shown: "Search & nominate" (all members), "Advance to Voting" (admin, ≥2 nominations) — transitions: nominating → voting (admin clicks "Advance to Voting"), nominating → cancelled (admin via `rounds.cancel` API)
State: voting — buttons shown: nomination cards (toggle), "Submit N votes" / "Save changes" / "✓ Votes saved" (all members), "Close voting & reveal winner" + "Cancel round" (admin) — transitions: voting → decided (admin clicks "Close voting" → `rounds.advance`), voting → cancelled (admin clicks "Cancel round" → `rounds.cancel`)
State: decided — buttons shown: "Start new round" (admin) — transitions: terminal; admin starts a new round via `rounds.create`
State: cancelled — buttons shown: none (round excluded from active list) — transitions: terminal

## Round Lifecycle API

- `[x]` **VOTE-API-001**: When an admin calls `rounds.create`, the system SHALL create the round in "nominating" status. (`rounds.ts:17`)
- `[x]` **VOTE-API-002**: When an admin calls `rounds.advance` on a round in "nominating", the system SHALL transition it to "voting" status. (`rounds.ts:118-126`)
- `[x]` **VOTE-API-003**: When an admin calls `rounds.advance` on a round in "voting", the system SHALL transition it to "decided", determine the winner via `tallyVotes`, set the winning book as the club's current book (BookSelection with isCurrent=true), and demote any prior current selection. (`rounds.ts:128-181`)
- `[x]` **VOTE-API-DECIDED-FINISHED-001**: When demoting a prior current `BookSelection` (during `rounds.advance` to "decided" or `selections.createDirectPick`), the system SHALL also stamp `finishedAt: new Date()` on that prior selection so the history picker renders it as "Finished {MMM YYYY}" per `PROG-UI-BOOK-008` instead of falling back to "Selected {MMM YYYY}". Already-stamped `finishedAt` values SHALL NOT be overwritten. (`rounds.ts:156-160`, `selections.ts:23-26`)
- `[x]` **VOTE-API-004**: When an admin calls `rounds.cancel`, the system SHALL set status to "cancelled" and delete all associated nominations and votes. (`rounds.ts:189-217`)
- `[x]` **VOTE-API-CANCEL-GUARD-001**: `rounds.cancel` SHALL throw BAD_REQUEST if the round is already "decided" or "cancelled". (`rounds.ts:189-217`)
- `[x]` **VOTE-BE-001**: The winning book SHALL be determined by highest approval count. Ties SHALL be broken by earliest nomination timestamp.
- `[x]` **VOTE-BE-002**: The system SHALL allow only one active round (status "nominating" or "voting") per club at a time. `rounds.create` throws CONFLICT otherwise. (`rounds.ts:17-66`)

## Nominations API

- `[x]` **VOTE-API-005**: When a member calls `nominations.create` during "nominating" phase, the system SHALL add the book to the round. (`nominations.ts:7-60`)
- `[x]` **VOTE-API-006**: When a member attempts to nominate a book already nominated in the same round, the system SHALL throw a CONFLICT error (unique on `(roundId, bookId)`).
- `[x]` **VOTE-API-007**: When a member attempts to nominate during "voting" or "decided" phase, the system SHALL throw a BAD_REQUEST error.
- `[x]` **VOTE-API-NOMDEL-001**: The `nominations.delete` procedure SHALL allow the original nominator OR any admin/owner to delete a nomination. (`nominations.ts:62-89`)
- `[x]` **VOTE-DATA-001**: Each nomination SHALL have a unique `(round_id, book_id)` pair.

## Voting API

- `[x]` **VOTE-API-008**: When a member calls `votes.submit`, the system SHALL accept a list of `nominationIds` and replace all previous votes for that user in that round. (`votes.ts:7-71`)
- `[x]` **VOTE-API-VOTE-GUARD-001**: `votes.submit` SHALL throw BAD_REQUEST when the round is not in "voting" status, or when `nominationIds.length > maxApprovalsPerMember`, or when any nominationId is not a member of this round. (`votes.ts:7-71`)
- `[x]` **VOTE-BE-003**: The system SHALL enforce that a member cannot approve more than `max_approvals_per_member` nominations in a single round (default 3, min 1).
- `[x]` **VOTE-DATA-002**: The system SHALL enforce one vote per `(round_id, nomination_id, user_id)` tuple.

## Vote Visibility

- `[x]` **VOTE-API-VISIBILITY-001**: `rounds.get` SHALL hide vote counts and other members' votes while the round is in "nominating" or "voting" status; only the calling user's own votes are returned. (`rounds.ts:68-96`)
- `[x]` **VOTE-API-VISIBILITY-002**: `rounds.get` SHALL return all votes and full per-nomination vote counts when the round is in "decided" status. (`rounds.ts:68-96`)
- `[x]` **VOTE-UI-001**: While a round is in "voting" status, the UI SHALL hide vote tallies from all members. The voter-turnout sidebar shows only "X of N have voted" with a "Tallies hidden until close" hint. (`vote-round.tsx:263-277`)
- `[x]` **VOTE-UI-002**: When a round reaches "decided" status, the UI SHALL display the full vote tallies and winner to all members. (`vote-round.tsx:283-369`)

## Voting UI — Nominating Phase

- `[x]` **VOTE-UI-NOM-001**: The phase SHALL display nomination cards showing book cover, pitch text (if any), nominator name, and relative nomination time (e.g. "2h ago"). (`vote-round.tsx:412-435`)
- `[x]` **VOTE-UI-NOM-002**: Button: "Search & nominate" (`vote-round.tsx:402-409`) is visible to all members in "nominating" phase and opens the `NominateModal`.
- `[x]` **VOTE-UI-NOM-003**: Button: "Advance to Voting" (`vote-round.tsx:440-449`) is visible only to admins, disabled when `nominations.length < 2`, and calls `rounds.advance`. Adjacent help text "Needs at least 2 nominations" is shown when disabled.
- `[x]` **VOTE-UI-NOM-COUNT-001**: A header reads "{N} nomination(s) so far. Anyone can nominate." (`vote-round.tsx:398-401`)

## Nominate Modal

- `[x]` **VOTE-UI-NOMMODAL-001**: The modal opens with a search tab. Button: search input with 300ms debounce calling `books.search`. (`nominate-modal.tsx:230-247`)
- `[x]` **VOTE-UI-NOMMODAL-002**: Button: "Nominate" (per result row, `nominate-modal.tsx:272-283`) calls `nominations.create` with `{clubId, roundId, bookId}`; on success closes modal and refreshes via `onNominationSuccess`.
- `[x]` **VOTE-UI-NOMMODAL-003**: When a search returns zero results, the modal SHALL show "No books found" and a Button: "Enter manually" that switches to the manual-entry tab. (`nominate-modal.tsx:290-305`)
- `[x]` **VOTE-UI-NOMMODAL-004**: Manual-entry tab SHALL include inputs for Title (required), Author (required), ISBN (optional), Page Count (optional). Validation: title and author non-empty. (`nominate-modal.tsx:321-409`)
- `[x]` **VOTE-UI-NOMMODAL-005**: Button: "Create & Nominate" (`nominate-modal.tsx:398-406`) creates a manual Book via `books.createManual`, then nominates it via `nominations.create`.
- `[x]` **VOTE-UI-NOMMODAL-006**: Button: "Back" (`nominate-modal.tsx:383-394`) returns from manual tab to search tab and resets manual form fields.
- `[x]` **VOTE-UI-NOMMODAL-007**: Button: "Cancel" (`nominate-modal.tsx:311-318`) and the close X icon and the backdrop click (`nominate-modal.tsx:204-224`) all call `onClose`.
- `[ ]` **VOTE-UI-NOMMODAL-PITCH-001**: Pitch textarea (max 500 chars) — described in LLD but not present in the modal; nominations are created without a pitch.

## Voting UI — Voting Phase

- `[x]` **VOTE-UI-VOTE-001**: Each nomination renders as a clickable card Button (`vote-round.tsx:155-196`) toggling membership of `selected` state. Cards are disabled when `selected.length >= maxApprovals && !isSelected` (visual: opacity-50, cursor-not-allowed).
- `[x]` **VOTE-UI-VOTE-002**: The header pill shows used picks as filled dots over total picks: "{N}/{maxApprovals}" with a Picks label. (`vote-round.tsx:127-147`)
- `[x]` **VOTE-UI-005**: The approval cap indicator is a row of small circles where filled = primary teal background, empty = transparent with line border. The sidebar version uses larger 28px dots with check icons inside filled state. (`vote-round.tsx:235-260`) Older spec's "◉◉○" was descriptive only — current visual treatment is the implemented form.
- `[x]` **VOTE-UI-VOTE-003**: The submit button has three labels driven by `(hasVoted, hasPendingChanges)` to make the modify-a-vote affordance obvious:
  - never voted, picks selected → **"Submit {N} votes"** (primary, enabled)
  - voted, no pending edits → **"✓ Votes saved"** (disabled — no action to take)
  - voted, with pending edits → **"Save changes"** (primary, enabled)
  Disabled when `selected.length === 0`. The component sets `data-state` to `first-submit | save-changes | saved` on the button for E2E assertions. Calls `votes.submit` on click. (Replaces the older "✓ Voted — Update {N}?" label, which conflated saved-state with action-required state.)
- `[x]` **VOTE-UI-VOTE-004**: After a successful vote submission the UI SHALL show a small success message "✓ Your votes have been recorded" below the button (only when `hasVoted && !loading`). (`vote-round.tsx:218-222`)
- `[x]` **VOTE-UI-009** (alias `VOTE-UI-VOTE-005`): The voting sidebar (desktop only, `lg:flex`) SHALL show: a "Voting open" badge, "You've approved {N} / {max}" counter, the dot indicator row, and a "Voter turnout" card "{voterCount} of {memberCount} have voted · Tallies hidden until close". (`vote-round.tsx:226-278`)
- `[ ]` **VOTE-UI-VOTE-DEADLINE-001**: Voting deadline (date/time picker on round creation) is in the data model but not surfaced in the create UI or voting sidebar.

## Vote Persistence and Update Experience

These specs cover what happens when a member revisits the voting page after they've already voted, and how their selections + voter-turnout numbers stay in sync as votes come in.

- `[x]` **VOTE-DATA-VOTE-PERSIST-001**: User votes SHALL persist in the `Vote` table across sessions. On resubmit, the system SHALL atomically replace the user's previous votes for that round (delete-then-createMany inside a single procedure). (`votes.ts:54-67`)
- `[x]` **VOTE-API-MY-VOTES-001**: During the "voting" phase, `rounds.get` SHALL return each nomination's `votes` array filtered to the calling user's own votes only (other members' votes hidden until "decided"). Clients derive the user's prior selections from `nominations[i].votes[*].nominationId`. (`rounds.ts:85-93`)
- `[x]` **VOTE-UI-PRIOR-VOTES-001**: When a member loads the voting page after having previously submitted votes, the UI SHALL pre-select their prior selections so the displayed state matches what is persisted server-side. (`vote/page.tsx:38-43` derives `myVotes` from `activeRoundDetail.nominations` via `derivePriorVotes`; `vote-round.tsx:54-66` initializes `selected` from the prop and re-syncs on `router.refresh()`.)
- `[x]` **VOTE-UI-PRIOR-VOTES-002**: When prior votes are present on page load, the submit button SHALL render in the "✓ Votes saved" state (disabled) and the picks area SHALL show a hint explaining how to modify the vote: "You voted previously — tap a book to add or remove it, then save your changes." Toggling any nomination flips the button to "Save changes" (enabled). Hint test ID: `prior-vote-hint`. (`src/lib/voting/prior-votes.ts`, `vote-round.tsx:230`)
- `[x]` **VOTE-UI-TURNOUT-LIVE-001**: After a successful `votes.submit`, the "Voter turnout" card SHALL refresh without a manual page reload. (`vote-round.tsx:97-103` calls `router.refresh()` in the success path; the server component re-fetches the distinct voter count and the new value renders in place.)
- `[x]` **VOTE-UI-TURNOUT-CHANGE-COUNT-001**: First vote increments the turnout count; updating an existing vote leaves it unchanged. The DB-level distinct-on-userId count already gives this semantic (`vote/page.tsx:48-54`), and `router.refresh()` surfaces the latest value to the UI.
- `[x]` **VOTE-UI-UPDATE-CONFIRM-001**: Distinct success messages — "✓ Your votes have been recorded" on first submit, "✓ Your votes have been updated" on subsequent submits. (`vote-round.tsx:99-101` tracks `lastSubmitWasUpdate`; `vote-round.tsx:251-256` renders via `successMessage(lastSubmitWasUpdate)`.) The toast also clears as soon as the user toggles a nomination again (`vote-round.tsx:79`).

## Voting UI — Decided Phase

- `[x]` **VOTE-UI-DEC-001**: The winner banner SHALL display in a gradient card containing book cover, "Winner" badge + "Round winner" caption, title, "by {author} · nominated by {nominator}" subtitle, and a vote-count display "{N} votes". (`vote-round.tsx:288-325`)
- `[!]` **VOTE-UI-006**: Older spec listed two CTAs in the winner banner ("Set up first meeting" and "View on Open Library"). NEITHER is implemented; the winner banner is purely informational. Treat as gaps if these CTAs become required:
  - `[ ]` **VOTE-UI-DEC-CTA-MEETING-001**: "Set up first meeting" CTA in winner banner.
  - `[ ]` **VOTE-UI-DEC-CTA-OPENLIB-001**: "View on Open Library" CTA in winner banner.
- `[x]` **VOTE-UI-DEC-002**: Below the winner, a "Final tallies" card SHALL list all nominations ranked by vote count, with position indicator (① for #1, then "0N" mono numerals), book cover, title/author, a per-row progress bar (`width = votes / maxVotes * 100%`), and a "{N} votes" right column. The first row has a tinted background. (`vote-round.tsx:343-366`)
- `[x]` **VOTE-UI-DEC-003**: Button: "Start new round" (`vote-round.tsx:331-339`) is visible only to admins on decided phase and calls `rounds.create`.

## Voting UI — Voting → Decided (Manual Close)

- `[x]` **VOTE-UI-CLOSE-001**: The voting phase SHALL surface an admin-only UI control that calls `rounds.advance` to transition the round to "decided". Implemented per VOTE-UI-CLOSE-002+.
- `[x]` **VOTE-UI-CLOSE-BTN-001**: An admin-only "Close voting" / "Reveal results" button in the voting phase that calls `rounds.advance`. (Replaced by VOTE-UI-CLOSE-002+.)
- `[x]` **VOTE-UI-CLOSE-002**: During the voting phase, an admin+ SHALL see a "Close voting & reveal winner" button in the round panel. Members SHALL NOT see it.
- `[x]` **VOTE-UI-CLOSE-003**: Clicking the button SHALL open a confirmation dialog showing the top 3 books by current approval count, with the leader marked "Will become the current book".
- `[x]` **VOTE-UI-CLOSE-004**: The dialog SHALL warn that closing is irreversible, require an explicit "Close voting" confirm click, and call `rounds.advance` on confirm.
- `[x]` **VOTE-UI-CLOSE-005**: If a tie exists at close time, the dialog SHALL display "Tied with N other(s) — earliest nomination wins" next to the leader, naming the rule applied (per VOTE-BE-001).
- `[x]` **VOTE-UI-CLOSE-006**: After successful close, the page SHALL transition to the decided view without a hard reload, and the club dashboard's "Current Book" card SHALL reflect the new pick on next visit (already wired via `BookSelection.isCurrent`).
- `[x]` **VOTE-UI-CLOSE-007**: The Close button SHALL be disabled with helper text "No votes cast yet" if zero approvals exist across all nominations.

## Cancel Round UI

- `[x]` **VOTE-UI-CANCEL-001**: The voting and nominating phases SHALL surface an admin-only "Cancel round" action that calls `rounds.cancel`. Implemented per VOTE-UI-CANCEL-002.
- `[x]` **VOTE-UI-CANCEL-BTN-001**: An admin-only "Cancel round" button on nominating and voting phases that calls `rounds.cancel`, with a confirmation dialog. (Replaced by VOTE-UI-CANCEL-002.)
- `[x]` **VOTE-UI-CANCEL-002**: An admin+ SHALL see a secondary "Cancel round" action in nominating and voting phases that calls `rounds.cancel` with a typed-confirmation dialog (user types the word "cancel").

## Deferred — Manual Tie Override

- `[D]` **VOTE-BE-TIE-MANUAL-001**: When a tie exists at close time, the system MAY return a `tiedBookIds[]` payload and let the owner manually pick the winner before committing. Not in v1 — current behavior uses automatic earliest-nomination tie-break per VOTE-BE-001.

## Deadlines

- `[ ]` **VOTE-UI-DEADLINE-NOM-001**: Optional nomination deadline picker on round creation. Field exists on `VotingRound` model; no UI exposes it.
- `[ ]` **VOTE-UI-DEADLINE-VOTE-001**: Optional voting deadline picker on round creation or on advance-to-voting. Field exists on `VotingRound` model; no UI exposes it.

## Book Metadata API

- `[x]` **VOTE-API-009**: The `books.search` procedure SHALL query the local DB by title/author/ISBN (case-insensitive), then fall through to Open Library API, caching results back into the local Book table. Returns empty array on API failure (graceful degradation). (`books.ts:7-72`)
- `[x]` **VOTE-BE-004**: The system SHALL cache book metadata locally after the first lookup to avoid repeated external API calls.
- `[x]` **VOTE-API-MANUAL-001**: The `books.createManual` procedure SHALL create a Book with `openLibraryId=null`, marking it as manually entered. Requires non-empty title and author (max 500 chars each). (`books.ts:75-96`)

## Book Selection History API

- `[x]` **VOTE-API-010**: The `selections.list` procedure SHALL return all books the club has read, ordered by selection date (most recent first). Visible to all club members.
- `[x]` **VOTE-BE-005**: When an admin creates a BookSelection without a voting round (direct pick via `selections.createDirectPick`), the system SHALL set it as the current book immediately and demote prior selections.

## Notifications

- `[x]` **VOTE-NOTIFY-001**: When a round enters "nominating", the system SHALL email all club members. (`rounds.ts:17-66`)
- `[x]` **VOTE-NOTIFY-002**: When a round enters "voting", the system SHALL email all club members. (`rounds.ts:118-126`)
- `[x]` **VOTE-NOTIFY-004**: When a round is decided, the system SHALL email all club members with the winning book. (`rounds.ts:128-181`)
- `[ ]` **VOTE-NOTIFY-003**: When a voting deadline is 24 hours away, the system SHALL notify members who have not yet voted. (Requires deadline UI first.)

## Deferred

- `[D]` **VOTE-BE-006**: The system shall enforce a maximum number of nominations per member per round.
- `[D]` **VOTE-UI-HISTORY-001**: The system shall display reading history analytics (genre distribution, author diversity).
- `[D]` **VOTE-UI-FLAG-001**: Members shall be able to flag a nomination as "already read" to signal the group.
