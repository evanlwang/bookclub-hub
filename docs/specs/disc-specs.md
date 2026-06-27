# Discussion Thread Specs

**LLD**: docs/llds/discussion-threads.md
**Implementing artifacts**:
- API: `src/server/routers/threads.ts`, `src/server/routers/comments.ts`
- UI: `src/app/clubs/[clubId]/discussions/page.tsx` (RSC), `discussions-content.tsx`, `create-thread.tsx`, `comment-composer.tsx`, `[threadId]/page.tsx`, `[threadId]/comment-item.tsx`
- Tests: `tests/integration/discussions.test.ts`, `tests/e2e/comment-edit-delete.spec.ts`, `tests/e2e/comment-reply.spec.ts`, `tests/e2e/create-thread.spec.ts`, `tests/e2e/discussion-enhancements.spec.ts`, `tests/e2e/spoiler-safe-discussion.spec.ts`, `tests/unit/discussions-spoiler-cutoff.test.ts`, `tests/unit/validation/chapter-tag.test.ts`, `tests/unit/app/comment-composer-optimistic.test.tsx`, `tests/unit/app/discussions-no-waterfall.test.tsx`

Status markers: `[x]` implemented · `[ ]` gap · `[D]` deferred · `[!]` divergence

---

## Discussion State

State: thread list — buttons shown: "+ New note" (all), "You're on chapter" input, "Show all anyway" (when hidden count > 0), "Recent" / "Most replies" sort toggles, thread cards (clickable)
State: thread detail — buttons shown: per-comment "Reply" toggle, "Cancel" + "Post" reply composer, sticky "Post" comment composer
State: create thread — buttons shown: body textarea, chapter tag input, "Cancel", "Post note" (no title field)

## Threads API

- `[x]` **DISC-API-001**: When a member calls `threads.create` with title, body, and optional `chapterTag`, the system SHALL create the thread linked to the specified book and club.
- `[x]` **DISC-API-002**: When a member calls `threads.list` with `maxChapter=N`, the system SHALL return only threads where `chapterNumber IS NULL` OR `chapterNumber <= N`. The response SHALL also include `totalCount` (all threads for the book, unfiltered) and `hiddenCount` (`totalCount` minus the returned threads).
- `[x]` **DISC-API-LIST-SORT-001**: `threads.list` SHALL accept `sort: "recent" | "comments"` and return threads sorted accordingly.
- `[x]` **DISC-API-003**: `threads.update` (`src/server/routers/threads.ts:126-167`) accepts `body | chapterTag | isPinned` from author or admin and updates the row. Now wired into UI: thread edit (`DISC-UI-EDIT-BTN-001`) and admin pin toggle (`DISC-UI-PIN-BTN-001`) both call it.
- `[x]` **DISC-API-004**: `threads.delete` (`src/server/routers/threads.ts:168+`) deletes a thread + cascades comments (FK `onDelete: Cascade`). Now wired into UI by the thread-detail Delete affordance (`DISC-UI-DELETE-BTN-001`).
- `[x]` **DISC-DATA-001**: The system SHALL parse `chapterTag` into `chapterNumber` when the tag follows a recognizable pattern (e.g., "Chapter 5" → 5). When unparseable, `chapterNumber` is null.
- `[x]` **DISC-DATA-CHAPTER-BOUNDS-001**: When a book has a known chapter count, `threads.create` and `threads.update` SHALL reject chapter tags whose parsed chapter number exceeds the book's chapter count (BAD_REQUEST with a reason naming the upper bound). When the book has no known chapter count, any positive chapter is accepted. Unparseable tags ("Epilogue", "Prologue", free-form) always pass with `chapterNumber=null` and surface to every reader. The single enforcement seam is `validateChapterTag(tag, maxChapter)` in `src/lib/validation/chapter-tag.ts`; the router-side `lookupBookMaxChapter` helper is the single place where the book's chapter-count source plugs in (currently null — the `Book` model has only `pageCount` — so validation is permissive by default until a chapter-count column lands).

## Spoiler Filtering

- `[x]` **DISC-UI-001**: By default, the thread list SHALL hide threads tagged beyond the user's `maxChapter`. (`discussions-content.tsx:43-60`)
- `[x]` **DISC-UI-002**: The system SHALL display a count of hidden threads in the spoiler bar with the message "{N} note(s) waiting past your bookmark." (`discussions-content.tsx:102-113`)
- `[x]` **DISC-UI-003**: Button: "Show all anyway" (`discussions-content.tsx:105-112`, `data-testid="show-all-btn"`) — visible: `hiddenCount > 0 && !showAll` — handler: sets local `showAll=true` (per-session, not persisted).
- `[x]` **DISC-UI-004**: The spoiler filter bar SHALL include a chapter number input labeled "You're on chapter" (followed by "— later notes stay tucked away") with live update to the thread list. (`discussions-content.tsx:82-100`)
- `[x]` **DISC-BE-001**: Threads with `chapterNumber = null` (unparseable tags or no tag) SHALL always be shown regardless of progress filter.
- `[x]` **DISC-UI-PROGRESS-AUTOFILTER-001**: When the discussions page loads and the viewer has a recorded `currentChapter` for the current book, the page SHALL initialize `maxChapter` from that value so threads are spoiler-filtered by default. The viewer can still override the input or click "Show all". (`discussions/page.tsx`)
- `[x]` **DISC-UI-PROGRESS-AUTOFILTER-002**: When the viewer has no `currentChapter` recorded for the current book (no progress row, or `currentChapter` is null), the discussions page SHALL apply a fail-safe spoiler filter of `maxChapter=0`, hiding every chapter-tagged thread (untagged threads remain visible). The viewer can override via the chapter input or "Show all anyway" — see `DISC-LIB-CUTOFF-FAILSAFE-001`. **Re-spec from prior fail-open behavior that leaked spoilers to no-progress readers.**
- `[x]` **DISC-LIB-CUTOFF-FAILSAFE-001**: `deriveSpoilerCutoff` SHALL return `0` (not `null`) whenever the viewer has no progress row or no recorded `currentChapter`, so both the discussions page and the dashboard recent-feed default to hiding every chapter-tagged thread instead of leaking them. Negative chapter values (defensive) are also clamped to 0.
- `[D]` **DISC-LIB-CUTOFF-DERIVE-001**: When the viewer has `currentPage` and `totalPages` recorded but no `currentChapter`, AND the book has a known chapter count, `deriveSpoilerCutoff` MAY approximate a cutoff as `floor(currentPage / (totalPages / totalChapters))`. **Deferred** until the Book model carries a chapter count (currently only `pageCount`). Until then, the fail-safe (`= 0`) applies — see `DISC-LIB-CUTOFF-FAILSAFE-001`.
- `[x]` **DISC-UI-DASH-FEED-AUTOFILTER-001**: The dashboard "Recent Discussions" feed SHALL exclude threads tagged above the viewer's `currentChapter` (or omit the filter when no progress is recorded), so the dashboard never leaks spoilers via the recent feed. (`page.tsx` server loader)
- `[x]` **DISC-LIB-CUTOFF-001**: `deriveSpoilerCutoff(progress)` SHALL return the viewer's `currentChapter` (>= 0) when set, or `0` when no progress / no chapter is recorded (fail-safe per `DISC-LIB-CUTOFF-FAILSAFE-001`). Both UI surfaces SHALL use this helper to compute the `maxChapter` they pass to `threads.list`. (`src/lib/discussions/spoiler-cutoff.ts`)

## Comments API

- `[x]` **DISC-API-005**: When a member calls `comments.create` with optional `parentCommentId`, the system SHALL create the comment nested under the parent (or top-level if no parent).
- `[x]` **DISC-DATA-002**: Comment nesting SHALL be limited to one level. A reply (parentCommentId set) SHALL NOT be allowed to have its own children.
- `[x]` **DISC-API-006**: `comments.update` is wired through the comment-row Edit affordance (`DISC-UI-COMMENT-EDIT-001`).
- `[x]` **DISC-API-007**: `comments.delete` is wired through the comment-row Delete affordance (`DISC-UI-COMMENT-DELETE-001`); the `[deleted]` placeholder for comments-with-replies is rendered per `DISC-UI-COMMENT-DELETED-001` and resolved as `DISC-UI-008`.

## Content

- `[x]` **DISC-BE-002**: Thread bodies and comment bodies SHALL render as CommonMark Markdown via `marked` (GFM-flavored, breaks preserved). The rendering helper is `src/lib/discussions/markdown.ts` `renderBodyHtml`. Both the thread detail (`[threadId]/page.tsx`) and the comment item (`comment-item.tsx`) emit the rendered HTML via `dangerouslySetInnerHTML`.
- `[x]` **DISC-BE-003**: The Markdown renderer SHALL sanitize all output via `isomorphic-dompurify` against a strict allowlist (block + inline tags only; `href`/`title`/`rel`/`target` attributes only; URI schemes restricted to `http(s):` / `mailto:`). Raw HTML in source Markdown is stripped by both `marked`'s default (no inline HTML in our render path) and DOMPurify as defense-in-depth. (`src/lib/discussions/markdown.ts`)

## Discussions Page UI

- `[x]` **DISC-UI-PAGE-001**: Back link "Dashboard" with chevron returns to `/clubs/{clubId}`. (`discussions/page.tsx:54-60`)
- `[x]` **DISC-UI-PAGE-002**: Page header shows the "Margin notes" title. (`discussions/page.tsx:62-64`)
- `[x]` **DISC-UI-PAGE-003**: Button: "+ New note" (`create-thread.tsx:23-30`, `data-testid="new-thread-btn"`) is rendered in the sort/actions row and opens a compose `Sheet` (CreateThreadForm). (`discussions-content.tsx:152-158`)
- `[x]` **DISC-UI-PAGE-EMPTY-001**: When there are zero matching threads AND zero hidden threads, the list SHALL show "No discussions yet — start one with the button above." (`discussions-content.tsx:191-196` `data-testid="empty-state-none"`)
- `[x]` **DISC-UI-PAGE-EMPTY-SPOILER-001**: When the visible thread list is empty BUT `hiddenCount > 0` (every thread is currently hidden by the spoiler filter), the list SHALL render a distinct state explaining that the viewer's chapter setting is hiding everything, naming the hidden count and current chapter, and offering a "Show all anyway" button that toggles `showAll=true`. This prevents new readers from seeing "No discussions yet" when the club actually has active threads. (`discussions-content.tsx:165-190` `data-testid="empty-state-spoiler"`)
- `[ ]` **DISC-UI-PAGE-COUNT-001**: The thread count "{N} thread(s)" SHALL be shown above the list. **Removed from code** — the list no longer renders a thread-count header (the spoiler bar surfaces the hidden count instead). Marked as a gap pending decision to re-add or retire.
- `[x]` **DISC-UI-005**: The thread list SHALL support sort controls "Recent" / "Most replies" as tab-style toggles. (`discussions-content.tsx:131-150`)
- `[x]` **DISC-UI-PAGE-CARD-001**: Each thread card SHALL show: chapter chip (or "No tag" badge), comment count (right-aligned), a 2-line body excerpt (`line-clamp-2`) as the primary content, and author avatar + name + relative time. **Intentional re-spec from older text:** title was removed; body is the prominent text now (per `DISC-UI-COMPOSE-001`). (`discussions-content.tsx:210-253`)

## Compose Thread Form

- `[x]` **DISC-UI-COMPOSE-001**: **Replaced** — the form no longer collects a title. Current fields: required body textarea (4 rows), required chapter tag input with a live `ChapterChip` preview. The DB `title` column is preserved (NOT NULL); the server derives a title from the first line of the body when the client omits one. Implementation covered by `DISC-UI-COMPOSE-002` and `DISC-UI-COMPOSE-CHAPTER-REQUIRED-001` (both `[x]`).
- `[x]` **DISC-UI-COMPOSE-002**: The form SHALL render a body textarea (4 rows, autofocus, placeholder "What did the book do to you?") followed by a labeled chapter input. No title field. (`create-thread.tsx:99-144`)
- `[x]` **DISC-UI-COMPOSE-CHAPTER-REQUIRED-001**: The chapter tag input SHALL be marked required (label `"Chapter tag *"`, HTML `required` attr) and the Post note button SHALL be disabled until both body and chapter tag have non-whitespace content (and no spoiler mismatch — see `DISC-UI-COMPOSE-MISMATCH-DISABLE-001`). The input is wide (`flex-1 min-w-[14rem]`) and carries the placeholder `"e.g. Chapter 5, Prologue, Part II"`. (`create-thread.tsx:120-144`)
- `[x]` **DISC-UI-016**: The chapter tag input SHALL display a live `ChapterChip` preview inline as the user types. (`create-thread.tsx:138-142`)
- `[x]` **DISC-UI-COMPOSE-CANCEL-001**: Button: "Cancel" closes the form via `onCancel`. (`create-thread.tsx:178-180`)
- `[x]` **DISC-UI-COMPOSE-SUBMIT-001**: Button: "Post note" submits via `threads.create` (sends body + chapterTag, no title). (`create-thread.tsx:181-192`)

## Thread Detail UI

- `[x]` **DISC-UI-DETAIL-001**: Back link "Discussions" with chevron returns to the list. (`[threadId]/page.tsx:153-159`)
- `[x]` **DISC-UI-DETAIL-002**: The header SHALL show: chapter tag badge (or "No tag"), reply count, author avatar + name + relative time, and the thread body rendered at `text-base` as the post content. **Intentional re-spec from older text:** the title `<h1>` was removed since the form no longer collects a title (per `DISC-UI-COMPOSE-001`). (`[threadId]/page.tsx:170-276`)
- `[x]` **DISC-UI-DETAIL-EMPTY-001**: When there are zero comments, "No comments yet. Be the first!" SHALL be shown. (`[threadId]/page.tsx:291-293`)
- `[x]` **DISC-UI-DETAIL-COMMENT-001**: Each top-level comment renders in a Card with avatar, author name, date, body, and a "Reply" button.
- `[x]` **DISC-UI-013**: Button: per-comment "Reply" (`comment-item.tsx:206-215`) toggles an inline composer indented below the comment with a left-border accent (`comment-item.tsx:283-297`).
- `[x]` **DISC-UI-DETAIL-REPLY-002**: When replying, the inline composer SHALL include "Cancel" (cancels reply) and "Post" submit. (`comment-composer.tsx:121-137`)
- `[x]` **DISC-UI-DETAIL-NESTED-001**: Replies (one level only) render below their parent with `ml-6 pl-4 border-l-2` indentation. (`comment-item.tsx:259-270`)
- `[x]` **DISC-UI-009**: The bottom comment composer SHALL be sticky, anchored with `sticky bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0 mt-6 pt-3 pb-3` and a transparent-to-`--color-bg` gradient background, wrapping the composer in an elevated `Card`. (`[threadId]/page.tsx:324-341`)
- `[x]` **DISC-UI-DETAIL-COMPOSER-001**: Button: top-level "Post" (`comment-composer.tsx:127-136`) — disabled when body is empty/whitespace — calls `comments.create`.
- `[x]` **DISC-UI-COMPOSER-DRAFT-PRESERVE-001**: The comment composer SHALL clear its textarea ONLY on `comments.create` success. On error (network failure, validation rejection, etc.) the draft SHALL remain in the textarea verbatim so the user can retry without retyping. An inline error message is the only visible side effect of a failed submit. (`comment-composer.tsx` `onSuccess` / `onError`)

## Live Updates (mechanism: docs/llds/live-updates.md)

- `[x]` **DISC-UI-LIVE-001**: WHILE a member is viewing a thread detail page, new comments and edits from other members SHALL appear within 10s via a polled `threads.get` query, preserving the viewer's scroll position (stable comment keys; arrivals append in place).
- `[x]` **DISC-UI-LIST-LIVE-001**: WHILE a member is viewing the discussions list, new threads and updated comment counts SHALL appear within 30s via a polled `threads.list` query.
- `[x]` **DISC-UI-COMMENT-OPTIMISTIC-001**: WHEN the viewer posts a comment, it SHALL append to the thread immediately with a pending visual treatment (reduced opacity) before the server responds. IF the mutation fails, the pending comment SHALL be removed and the draft preserved in the composer (extends DISC-UI-COMPOSER-DRAFT-PRESERVE-001 — draft clears only on success). On settle, the thread query SHALL be invalidated so the temp comment is replaced by the server row.
- `[x]` **DISC-UI-FETCH-PARALLEL-001**: The discussions page SHALL resolve the current book and the viewer's spoiler cutoff server-side (RSC, parallel fetches) and pass them as initial values to the client — eliminating the client-side selections → progress → threads request waterfall. Fail-safe cutoff semantics per DISC-LIB-CUTOFF-FAILSAFE-001 are unchanged.

## Comment Edit and Delete

- `[x]` **DISC-UI-COMMENT-CONTROLS-001**: Each non-deleted comment row (top-level or reply) SHALL render a small affordance row at the bottom containing "Reply" (top-level only), "Edit" (viewer is author), and "Delete" (viewer is author OR admin/owner). Affordances are text links; the Delete affordance pairs a small trash icon with its label. When the viewer has none of these privileges, only the existing Reply (if applicable) renders. (`comment-item.tsx:176-238`; viewer/role from `useViewer(clubId)` in `[threadId]/page.tsx:50`)
- `[x]` **DISC-UI-COMMENT-EDIT-001**: Clicking "Edit" SHALL replace the comment body with an inline `<textarea>` (3 rows, body prefilled, autofocused) plus "Save" / "Cancel" buttons. Save calls `comments.update`; on success the row re-renders the new body and the (edited) indicator. Cancel restores the original view without writing. Save is disabled when the textarea is empty or whitespace-only, or unchanged. Esc cancels. (`comment-item.tsx:120-163,216-224`)
- `[x]` **DISC-UI-COMMENT-DELETE-001**: Clicking "Delete" SHALL replace the affordance row in place with "Delete this comment? · Yes, delete · Cancel". "Yes, delete" calls `comments.delete`; on success the parent refetches the thread, which removes the row (or shows the `[deleted]` placeholder if the comment had replies). No native `confirm()` dialog. Cancel returns to the affordance row. (`comment-item.tsx:127-130,179-235`)
- `[x]` **DISC-UI-COMMENT-DELETED-001**: When `comment.body === "[deleted]"` (placeholder for a deleted comment that retains replies), the body SHALL render italic-gray as "[deleted]" and the affordance row SHALL be omitted entirely. Author name and timestamp remain visible so the conversation still has context. (`comment-item.tsx:71,133-135,176`)
- `[x]` **DISC-UI-COMMENT-EDITED-001**: When `comment.updatedAt - comment.createdAt > 1000ms` (`EDITED_THRESHOLD_MS`), the timestamp area SHALL include a "(edited)" suffix in the same muted style. The 1s threshold avoids spurious labels from Prisma's same-transaction updatedAt drift. (`comment-item.tsx:46-53,247-249`)

## Gaps (older spec described but not implemented)

- `[x]` **DISC-UI-007**: The thread detail header SHALL render Edit and Delete affordances for the author and admins. Implemented via the sub-IDs below as inline icon buttons (SVG pencil / trash / pin) in the header, unlike the comment controls which are text links. (`[threadId]/page.tsx:382-485` `ThreadHeaderActions`)
  - `[x]` **DISC-UI-EDIT-BTN-001**: When `viewerId === thread.authorId`, the thread header SHALL render an "Edit" icon button (`data-testid="thread-edit-btn"`, `title="Edit"`) that swaps the body in place for a textarea with Save/Cancel. Save calls `threads.update({body})`. (`[threadId]/page.tsx:456-469`)
  - `[x]` **DISC-UI-DELETE-BTN-001**: When `viewerId === thread.authorId` OR viewer role is admin/owner, the thread header SHALL render a "Delete" icon button (`data-testid="thread-delete-btn"`, `title="Delete"`). Clicking SHALL replace the affordance row with an inline "Delete this thread? · Yes, delete · Cancel" confirmation; "Yes, delete" calls `threads.delete` and navigates back to `/clubs/{clubId}/discussions`. (`[threadId]/page.tsx:414-435,470-482`)
- `[x]` **DISC-UI-006**: Pin toggle (admin) and pinned-thread visual treatment. Implemented via the sub-IDs below.
  - `[x]` **DISC-UI-PIN-BTN-001**: Admins SHALL see a Pin / Unpin icon-button toggle in the thread-detail header (`data-testid="thread-pin-btn"`, `aria-pressed={isPinned}`, `title` toggles "Pin"/"Unpin"). Clicking calls `threads.update({isPinned: !current})`. (`[threadId]/page.tsx:440-455`)
  - `[x]` **DISC-UI-PIN-VISUAL-001**: Pinned threads SHALL carry `data-pinned="true"` and render distinct pinned treatments on both surfaces: in the discussions list, an `bg-accent-soft border-accent/20` card with a "Pinned" accent `Badge` (`discussions-content.tsx:203-227`); in the thread detail header, a `bg-warning-soft/45 border-warning/40` card with a "PINNED" label (`[threadId]/page.tsx:166-178`).
- `[x]` **DISC-UI-008**: "[deleted]" placeholder for deleted comments with replies is implemented — when a deleted comment retains replies, `comment.body` is set to `"[deleted]"` and the row renders italic-gray. Implementation cited under `DISC-UI-COMMENT-DELETE-001` and `DISC-UI-COMMENT-DELETED-001` (both `[x]`).
- `[x]` **DISC-UI-010**: Reply buttons are **always visible**, not hover-revealed — intentional re-spec from older text. The Reply affordance lives in the per-comment controls row (`DISC-UI-COMMENT-CONTROLS-001`); no hover/focus reveal is needed.
- `[x]` **DISC-UI-014/015/017**: Real-time spoiler-mismatch detection in the compose form (warning banner, "Resolve spoiler warning" disabled state) and the "Spoiler-safe by default" info card. Implemented via the four sub-IDs below; the original spec's amber-border treatment was replaced by a danger-toned banner per the design system.
  - `[x]` **DISC-UI-COMPOSE-MISMATCH-001**: The compose form SHALL run a real-time mismatch detector (`detectChapterMismatch` in `src/lib/discussions/chapter-mismatch.ts`) on every body/tag change, parsing chapter mentions ("chapter N", "ch. N", "ch N") via `\b(chapter|ch\.?)\s*(\d+)\b` and flagging when the largest body-chapter exceeds the largest tag-chapter.
  - `[x]` **DISC-UI-COMPOSE-MISMATCH-WARN-001**: When a mismatch is detected, the form SHALL render a danger-toned warning banner (`data-testid="compose-mismatch-warning"`, `role="alert"`) naming both the body's chapter and the tag's chapter and instructing the user to either bump the tag or trim the body.
  - `[x]` **DISC-UI-COMPOSE-MISMATCH-DISABLE-001**: When a mismatch is detected, the Post button SHALL be disabled and SHALL relabel to "Resolve spoiler warning".
  - `[x]` **DISC-UI-COMPOSE-INFO-001**: When body and tag are both filled and there is no mismatch, the form SHALL render a small "Spoiler-safe by default — only members past Chapter N will see this." info card (`data-testid="compose-info-card"`). (`create-thread.tsx:160-170`)
- `[x]` **DISC-UI-011**: Single-line truncated body preview is implemented (`line-clamp-1`).
- `[x]` **DISC-UI-012**: Thread detail metadata (chapter chip, author, date, body) is rendered inline in the header (`DISC-UI-DETAIL-002`) rather than in a separate sidebar. The older spec's sidebar layout was deliberately replaced by the inline header — `chapter-chip.tsx` is the chip component used in that inline layout.

## Deferred

- `[D]` **DISC-NOTIFY-001**: Notify a user when someone replies to their thread or comment.
- `[D]` **DISC-UI-REACT-001**: Emoji reactions on threads and comments.
- `[D]` **DISC-BE-004**: Full-text search across threads and comments.
- `[D]` **DISC-DATA-003**: Edit history for comments.
