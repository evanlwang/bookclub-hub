# Prompt: Implement Missing Interactive UI + E2E Tests

Paste this into a fresh Claude Code session in the `bookclub-hub` directory.

---

## Task

Implement the missing interactive UI for BookClub Hub. The app has a complete tRPC API (11 routers, all tested) and styled read-only pages. Add client-side forms/modals that call the existing mutations, then write Playwright E2E tests for each.

## Critical Context

- **Stack**: Next.js 16 (App Router), React 19, Tailwind CSS 4, tRPC v11
- **tRPC call pattern**: All client mutations use `POST /api/trpc/{router}.{method}` with raw JSON body (no `{json:...}` wrapper). Responses are at `data.result?.data`.
- **Existing UI components** are in `src/components/ui/` (Button, Card, Badge, Avatar, BookCover, ProgressBar, icons). Use them.
- **Design tokens** are in `src/app/globals.css` (oklch colors, Newsreader/Geist/JetBrains Mono fonts).
- **E2E helpers** are in `tests/e2e/helpers.ts`: `loginAs(page, email)`, `getClubByCode(code)`, `getBookByTitle(title)`.
- **Golden test data** (club: WEDREADS, users: alice/bob/carol/dave/eve/frank@example.com, book: "Dune" 412 pages, 4 discussion threads, 1 proposed meeting with 3 slots, reading progress for all 6 members).
- **Existing tests must keep passing**: 84 unit + 78 integration + 36 E2E = 198 total.

## API Mutations Available

```
progress.update({ clubId, bookId, currentPage?, percentage?, currentChapter?, status?, totalPages? })
threads.create({ clubId, bookId, title, body, chapterTag? })
comments.create({ clubId, threadId, body, parentCommentId? })
votes.submit({ clubId, roundId, nominationIds[] })
rounds.create({ clubId, maxApprovalsPerMember? })
rounds.advance({ clubId, roundId })
meetings.create({ clubId, title?, bookId?, description?, location?, slots[{time, durationMinutes?}] }) — min 2 slots, max 5
meetings.submitAvailability({ clubId, meetingId, responses[{slotId, status}] }) — status: "available"|"maybe"|"unavailable"
```

## Implementation Order (do each phase fully before moving to the next)

### Phase 1: Progress Update Modal

Create `src/app/clubs/[clubId]/progress/update-modal.tsx` ("use client"):
- Triggered by "Update My Progress" button on the progress page
- Modal overlay with: page number input (large), live percentage display (auto-computed from page/totalPages), chapter input (optional), 3 large radio cards for status (Not Started / Reading / Finished)
- Selecting "Finished" auto-sets percentage to 100%
- "Save" button shows loading spinner, calls `progress.update`, closes modal on success
- Add the button + modal to the existing progress page (keep server data fetch, add client island)

Write `tests/e2e/progress-update.spec.ts`:
- Open modal, enter page number → percentage updates live
- Select "Finished" → percentage shows 100%
- Submit → modal closes, page reflects new progress

### Phase 2: Discussion Thread Creation

Create `src/app/clubs/[clubId]/discussions/create-thread.tsx` ("use client"):
- "New Thread" button in the discussions page header opens this form
- Fields: title (required), body textarea (required), chapter tag input (optional, shows badge preview)
- Submit calls `threads.create`, on success refresh thread list
- Add the button to the existing discussions page

Write `tests/e2e/create-thread.spec.ts`:
- Click "New Thread", fill title + body, submit → new thread appears in list
- Add chapter tag → badge preview shows
- Submit with chapter tag → thread has tag in list

### Phase 3: Thread Detail + Comment Composer

Create `src/app/clubs/[clubId]/discussions/[threadId]/page.tsx`:
- Fetch thread + comments via `threads.get` (server component for initial data)
- Display: OP (title, chapter badge, author, body), then comments list
- Nested replies indented with left border line

Create `src/app/clubs/[clubId]/discussions/comment-composer.tsx` ("use client"):
- Sticky at bottom: textarea + "Post" button
- Calls `comments.create({ clubId, threadId, body })`
- Reply button on each comment opens inline reply form (adds `parentCommentId`)

Write `tests/e2e/comment-reply.spec.ts`:
- Navigate to thread detail → see OP and existing comments
- Type comment, submit → comment appears in list
- Click reply on a comment → inline form, submit → nested reply appears

### Phase 4: Voting Interactions

Create `src/app/clubs/[clubId]/vote/vote-round.tsx` ("use client"):
- Props: round data (nominations, status, maxApprovals)
- If status is "voting": show nomination cards as toggleable selections (click = select/deselect)
- Selected cards get highlight border. Max selections enforced.
- Submit button text: "Submit {N} votes" (updates live)
- After submit: show "✓ Voted" confirmation, button becomes "Update votes"
- Admin: "Start New Round" button (calls `rounds.create`)

Modify `src/app/clubs/[clubId]/vote/page.tsx`:
- Fetch round detail (with nominations) if an active round exists
- Pass data to VoteRound client component

Write `tests/e2e/vote-submission.spec.ts`:
- Need to create a voting-phase round in test setup. Use the test DB to create a round in "voting" status with nominations.
- Select cards → button count updates
- Cannot exceed max selections (3)
- Submit → success message shown
- Admin clicks "Start New Round" → new round created

### Phase 5: Meeting Scheduling

Create `src/app/clubs/[clubId]/meetings/create-meeting.tsx` ("use client"):
- "Propose Meeting" button opens form
- Title input, description (click "Add description" to expand)
- Time slots: start with 2 rows (datetime-local + duration select). "Add another time" button (max 5). X button removes a slot (min 2).
- Submit calls `meetings.create`

Create `src/app/clubs/[clubId]/meetings/respond-meeting.tsx` ("use client"):
- Shows when clicking a proposed meeting card
- Lists time slots with 3 radio buttons each: Available (green) / Maybe (amber) / Unavailable (red)
- "Save Availability" button calls `meetings.submitAvailability`
- Shows "✓ Saved" on success

Modify `src/app/clubs/[clubId]/meetings/page.tsx`:
- Add "Propose Meeting" button
- Make meeting cards clickable → expand to show respond UI

Write `tests/e2e/meeting-create-respond.spec.ts`:
- Click "Propose Meeting", fill title, set 2 time slots, submit → meeting appears in list
- Add a third slot → shows 3 rows. Remove one → back to 2.
- Click existing meeting → respond UI appears. Select availability, save → "Saved" shown.

## Constraints

- All new components are `"use client"` — keep the parent page's server data fetch intact
- Use the existing `Button` component from `src/components/ui/button.tsx` (has loading prop)
- Use existing `Card`, `Badge` from `src/components/ui/`
- Match the design aesthetic: `rounded-[var(--radius-md)]`, `border border-line`, `text-sm`, `font-medium`, warm colors
- Every form button must show loading state during API call
- Every successful mutation must show visible feedback (inline confirmation, modal close, or list refresh)
- `data-testid` attributes on all interactive elements for E2E targeting
- After ALL phases complete, run: `npx tsc --noEmit && npx vitest run && npx vitest run --config vitest.config.integration.ts && npx playwright test` — everything must pass.
