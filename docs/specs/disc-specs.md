# Discussion Thread Specs

**LLD**: docs/llds/discussion-threads.md
**Implementing artifacts**:
- API: `src/server/routers/threads.ts`, `src/server/routers/comments.ts`
- UI: `src/app/clubs/[clubId]/discussions/page.tsx`, `create-thread.tsx`, `comment-composer.tsx`, `[threadId]/page.tsx`
- Tests: `tests/integration/discussions.test.ts`, `tests/e2e/comment-edit-delete.spec.ts`, `tests/e2e/comment-reply.spec.ts`, `tests/e2e/create-thread.spec.ts`, `tests/e2e/discussion-enhancements.spec.ts`, `tests/e2e/spoiler-safe-discussion.spec.ts`, `tests/unit/discussions-spoiler-cutoff.test.ts`, `tests/unit/validation/chapter-tag.test.ts`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Discussion State

State: thread list — buttons shown: "New Thread" (all), "I'm on chapter:" input, "Show all" (when filtered count > 0), "Recent" / "Most comments" sort toggles, thread cards (clickable)
State: thread detail — buttons shown: per-comment "Reply" toggle, "Cancel" + "Post" reply composer, sticky "Post" comment composer
State: create thread — buttons shown: title input, body textarea, chapter tag input, "Cancel", "Post Thread"

## Threads API

- `[x]` **DISC-API-001**: When a member calls `threads.create` with title, body, and optional `chapterTag`, the system SHALL create the thread linked to the specified book and club.
- `[x]` **DISC-API-002**: When a member calls `threads.list` with `maxChapter=N`, the system SHALL return only threads where `chapterNumber IS NULL` OR `chapterNumber <= N`. The response SHALL also include `hiddenCount` (threads above maxChapter).
- `[x]` **DISC-API-LIST-SORT-001**: `threads.list` SHALL accept `sort: "recent" | "comments"` and return threads sorted accordingly.
- `[ ]` **DISC-API-003**: When a thread author or admin calls `threads.update`, the system SHALL update the specified fields (`title`, `body`, `chapterTag`, `isPinned`). Mutation may exist server-side; no UI calls it.
- `[ ]` **DISC-API-004**: When a thread author or admin calls `threads.delete`, the system SHALL delete the thread and all comments. No UI calls it.
- `[x]` **DISC-DATA-001**: The system SHALL parse `chapterTag` into `chapterNumber` when the tag follows a recognizable pattern (e.g., "Chapter 5" → 5). When unparseable, `chapterNumber` is null.

## Spoiler Filtering

- `[x]` **DISC-UI-001**: By default, the thread list SHALL hide threads tagged beyond the user's `maxChapter`. (`discussions/page.tsx:66-91`)
- `[x]` **DISC-UI-002**: The system SHALL display a count of hidden threads with the message "{N} thread(s) hidden due to spoiler filter." (`discussions/page.tsx:135-146`)
- `[x]` **DISC-UI-003**: Button: "Show all" (`discussions/page.tsx:138-144`) — visible: `hiddenCount > 0 && !showAll` — handler: sets local `showAll=true` (per-session, not persisted). Note: actual label is "Show all" (older spec said "Show all anyway").
- `[x]` **DISC-UI-004**: The spoiler filter bar SHALL include a chapter number input ("I'm on chapter:") with live update to the thread list. (`discussions/page.tsx:117-134`)
- `[x]` **DISC-BE-001**: Threads with `chapterNumber = null` (unparseable tags or no tag) SHALL always be shown regardless of progress filter.
- `[x]` **DISC-UI-PROGRESS-AUTOFILTER-001**: When the discussions page loads and the viewer has a recorded `currentChapter` for the current book, the page SHALL initialize `maxChapter` from that value so threads are spoiler-filtered by default. The viewer can still override the input or click "Show all". (`discussions/page.tsx`)
- `[x]` **DISC-UI-PROGRESS-AUTOFILTER-002**: When the viewer has no `currentChapter` recorded for the current book (no progress row, or `currentChapter` is null), the discussions page SHALL apply no spoiler filter and show all threads.
- `[x]` **DISC-UI-DASH-FEED-AUTOFILTER-001**: The dashboard "Recent Discussions" feed SHALL exclude threads tagged above the viewer's `currentChapter` (or omit the filter when no progress is recorded), so the dashboard never leaks spoilers via the recent feed. (`page.tsx` server loader)
- `[x]` **DISC-LIB-CUTOFF-001**: `deriveSpoilerCutoff(progress)` SHALL return the viewer's `currentChapter` (>= 0) or `null` when no progress / no chapter is recorded. Both UI surfaces SHALL use this helper to compute the `maxChapter` they pass to `threads.list`. (`src/lib/discussions/spoiler-cutoff.ts`)

## Comments API

- `[x]` **DISC-API-005**: When a member calls `comments.create` with optional `parentCommentId`, the system SHALL create the comment nested under the parent (or top-level if no parent).
- `[x]` **DISC-DATA-002**: Comment nesting SHALL be limited to one level. A reply (parentCommentId set) SHALL NOT be allowed to have its own children.
- `[ ]` **DISC-API-006**: When a comment author calls `comments.update`, the system SHALL update the body. Mutation may exist; no UI calls it.
- `[ ]` **DISC-API-007**: When a comment author or admin calls `comments.delete`, the system SHALL remove it. Child comments (if any replies exist) SHALL remain visible with a "[deleted]" placeholder for the parent. No UI surfaces this today.

## Content

- `[ ]` **DISC-BE-002**: Thread bodies and comment bodies SHALL support CommonMark Markdown. Today bodies are rendered as plain text via `whitespace-pre-wrap` (`[threadId]/page.tsx:115-117`).
- `[ ]` **DISC-BE-003**: The system SHALL sanitize all HTML in rendered Markdown to prevent XSS. (Not applicable while plain-text rendering only.)

## Discussions Page UI

- `[x]` **DISC-UI-PAGE-001**: Back link "Dashboard" with chevron returns to `/clubs/{clubId}`. (`discussions/page.tsx:222-228`)
- `[x]` **DISC-UI-PAGE-002**: Page header shows "Discussions" title.
- `[x]` **DISC-UI-PAGE-003**: Button: "New Thread" (`create-thread.tsx:21-28`) is rendered above the filter and switches the area to the create form.
- `[x]` **DISC-UI-PAGE-EMPTY-001**: When there are zero matching threads, the list SHALL show "No discussions yet." (`discussions/page.tsx:171-174`)
- `[x]` **DISC-UI-PAGE-COUNT-001**: The thread count "{N} thread(s)" SHALL be shown above the list. (`discussions/page.tsx:151`)
- `[x]` **DISC-UI-005**: The thread list SHALL support sort controls "Recent" / "Most comments" as tab-style toggles. (`discussions/page.tsx:152-167`)
- `[x]` **DISC-UI-PAGE-CARD-001**: Each thread card SHALL show: chapter chip (if any), comment count (right-aligned), a 2-line body excerpt (`line-clamp-2`) as the primary content, and author avatar + name + relative time. **Intentional re-spec from older text:** title was removed; body is the prominent text now (per `DISC-UI-COMPOSE-001`). (`discussions/page.tsx:213-241`)

## Compose Thread Form

- `[x]` **DISC-UI-COMPOSE-001**: **Replaced** — the form no longer collects a title. Current fields: required body textarea (4 rows), required chapter tag input with helper text. The DB `title` column is preserved (NOT NULL); the server derives a title from the first line of the body when the client omits one. Implementation covered by `DISC-UI-COMPOSE-002` and `DISC-UI-COMPOSE-CHAPTER-REQUIRED-001` (both `[x]`).
- `[x]` **DISC-UI-COMPOSE-002**: The form SHALL render a body textarea (4 rows, autofocus, placeholder "What's on your mind?") followed by a labeled chapter input. No title field. (`create-thread.tsx:48-67`)
- `[x]` **DISC-UI-COMPOSE-CHAPTER-REQUIRED-001**: The chapter tag input SHALL be marked required (label `"Chapter *"`, HTML `required` attr) and the Post Thread button SHALL be disabled until both body and chapter tag have non-whitespace content. The input is wide enough (`flex-1 min-w-[16rem]`) that the placeholder `"e.g. Chapter 5, Prologue, Part II"` does not truncate. A helper line beneath the input reads "Used to filter threads by reader progress so members don't see spoilers ahead of where they are." (`create-thread.tsx:69-95`)
- `[x]` **DISC-UI-016**: The chapter tag input SHALL display a live `ChapterChip` preview inline as the user types. (`create-thread.tsx:84-88`)
- `[x]` **DISC-UI-COMPOSE-CANCEL-001**: Button: "Cancel" closes the form via `onCancel`. (`create-thread.tsx:103-105`)
- `[x]` **DISC-UI-COMPOSE-SUBMIT-001**: Button: "Post Thread" submits via `threads.create` (sends body + chapterTag, no title). (`create-thread.tsx:106-114`)

## Thread Detail UI

- `[x]` **DISC-UI-DETAIL-001**: Back link "Discussions" with chevron returns to the list. (`[threadId]/page.tsx:91-97`)
- `[x]` **DISC-UI-DETAIL-002**: The header SHALL show: chapter tag badge (if any), author avatar + name + date, and the thread body rendered at `text-base` as the post content. **Intentional re-spec from older text:** the title `<h1>` was removed since the form no longer collects a title (per `DISC-UI-COMPOSE-001`). (`[threadId]/page.tsx:124-138`)
- `[x]` **DISC-UI-DETAIL-EMPTY-001**: When there are zero comments, "No comments yet. Be the first!" SHALL be shown. (`[threadId]/page.tsx:124-126`)
- `[x]` **DISC-UI-DETAIL-COMMENT-001**: Each top-level comment renders in a Card with avatar, author name, date, body, and a "Reply" button.
- `[x]` **DISC-UI-013**: Button: per-comment "Reply" (`[threadId]/page.tsx:150-161`) toggles an inline composer indented below the comment with a left-border accent (replyingTo state).
- `[x]` **DISC-UI-DETAIL-REPLY-002**: When replying, the inline composer SHALL include "Cancel" (cancels reply) and "Post" submit. (`comment-composer.tsx:73-89`)
- `[x]` **DISC-UI-DETAIL-NESTED-001**: Replies (one level only) render below their parent with `ml-6 pl-4 border-l-2` indentation.
- `[x]` **DISC-UI-009**: The bottom comment composer SHALL be sticky with `sticky bottom-0 bg-bg pt-4 pb-2 border-t border-line`. (`[threadId]/page.tsx:204-211`)
- `[x]` **DISC-UI-DETAIL-COMPOSER-001**: Button: top-level "Post" (`comment-composer.tsx:79-87`) — disabled when body is empty/whitespace — calls `comments.create`.

## Comment Edit and Delete

- `[x]` **DISC-UI-COMMENT-CONTROLS-001**: Each non-deleted comment row (top-level or reply) SHALL render a small affordance row at the bottom containing "Reply" (top-level only), "Edit" (viewer is author), and "Delete" (viewer is author OR admin/owner). Buttons are text links, not icons. When the viewer has none of these privileges, only the existing Reply (if applicable) renders. (`comment-item.tsx:170-217`; viewer/role from `auth.me` in `[threadId]/page.tsx:36-58`)
- `[x]` **DISC-UI-COMMENT-EDIT-001**: Clicking "Edit" SHALL replace the comment body with an inline `<textarea>` (3 rows, body prefilled, autofocused) plus "Save" / "Cancel" buttons. Save calls `comments.update`; on success the row re-renders the new body and the (edited) indicator. Cancel restores the original view without writing. Save is disabled when the textarea is empty or whitespace-only, or unchanged. Esc cancels. (`comment-item.tsx:74-110,140-167`)
- `[x]` **DISC-UI-COMMENT-DELETE-001**: Clicking "Delete" SHALL replace the affordance row in place with "Delete this comment? · Yes, delete · Cancel". "Yes, delete" calls `comments.delete`; on success the parent refetches the thread, which removes the row (or shows the `[deleted]` placeholder if the comment had replies). No native `confirm()` dialog. Cancel returns to the affordance row. (`comment-item.tsx:112-133,176-197`)
- `[x]` **DISC-UI-COMMENT-DELETED-001**: When `comment.body === "[deleted]"` (placeholder for a deleted comment that retains replies), the body SHALL render italic-gray as "[deleted]" and the affordance row SHALL be omitted entirely. Author name and timestamp remain visible so the conversation still has context. (`comment-item.tsx:64-67,135-139,170`)
- `[x]` **DISC-UI-COMMENT-EDITED-001**: When `comment.updatedAt - comment.createdAt > 1000ms`, the timestamp area SHALL include a "(edited)" suffix in the same muted style. The 1s threshold avoids spurious labels from Prisma's same-transaction updatedAt drift. (`comment-item.tsx:38-44,232-237`)

## Gaps (older spec described but not implemented)

- `[!]` **DISC-UI-007**: Edit/delete icon buttons on thread header for author/admin — **not implemented in UI**.
  - `[ ]` **DISC-UI-EDIT-BTN-001**: Author/admin "Edit" icon on thread header.
  - `[ ]` **DISC-UI-DELETE-BTN-001**: Author/admin "Delete" icon on thread header.
- `[!]` **DISC-UI-006**: Pin toggle (admin) and pinned-thread visual treatment (amber background, "PINNED" label) — **not implemented**.
  - `[ ]` **DISC-UI-PIN-BTN-001**: Admin pin/unpin toggle on thread.
  - `[ ]` **DISC-UI-PIN-VISUAL-001**: Pinned thread visual treatment in the list.
- `[x]` **DISC-UI-008**: "[deleted]" placeholder for deleted comments with replies is implemented — when a deleted comment retains replies, `comment.body` is set to `"[deleted]"` and the row renders italic-gray. Implementation cited under `DISC-UI-COMMENT-DELETE-001` and `DISC-UI-COMMENT-DELETED-001` (both `[x]`).
- `[x]` **DISC-UI-010**: Reply buttons are **always visible**, not hover-revealed — intentional re-spec from older text. The Reply affordance lives in the per-comment controls row (`DISC-UI-COMMENT-CONTROLS-001`); no hover/focus reveal is needed.
- `[!]` **DISC-UI-014/015/017**: Real-time spoiler-mismatch detection in the compose form (amber border, warning banner, "Resolve spoiler warning" disabled state) and the "💡 Spoiler-safe by default" info card — **not implemented**.
  - `[ ]` **DISC-UI-COMPOSE-MISMATCH-001**: Real-time chapter-vs-body mismatch detection.
  - `[ ]` **DISC-UI-COMPOSE-MISMATCH-WARN-001**: Warning banner when mismatch detected.
  - `[ ]` **DISC-UI-COMPOSE-MISMATCH-DISABLE-001**: Disable Post button with "Resolve spoiler warning" label when mismatched.
  - `[ ]` **DISC-UI-COMPOSE-INFO-001**: "💡 Spoiler-safe by default" info card when no mismatch.
- `[x]` **DISC-UI-011**: Single-line truncated body preview is implemented (`line-clamp-1`).
- `[x]` **DISC-UI-012**: Thread detail metadata (chapter chip, author, date, body) is rendered inline in the header (`DISC-UI-DETAIL-002`) rather than in a separate sidebar. The older spec's sidebar layout was deliberately replaced by the inline header — `chapter-chip.tsx` is the chip component used in that inline layout.

## Deferred

- `[D]` **DISC-NOTIFY-001**: Notify a user when someone replies to their thread or comment.
- `[D]` **DISC-UI-REACT-001**: Emoji reactions on threads and comments.
- `[D]` **DISC-BE-004**: Full-text search across threads and comments.
- `[D]` **DISC-DATA-003**: Edit history for comments.
