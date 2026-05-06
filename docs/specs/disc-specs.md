# Discussion Thread Specs

**LLD**: docs/llds/discussion-threads.md
**Implementing artifacts**: TBD (implementation not started)

Status markers: `[x]` implemented · `[ ]` active gap · `[D]` deferred

---

## Threads

- `[x]` **DISC-API-001**: When a member calls `threads.create` with title, body, and optional chapter_tag, the system SHALL create the thread linked to the specified book and club.
- `[x]` **DISC-API-002**: When a member calls `threads.list` with `maxChapter=N`, the system SHALL return only threads where chapter_number is null OR chapter_number <= N.
- `[ ]` **DISC-API-003**: When a thread author or admin calls `threads.update`, the system SHALL update the specified fields (title, body, chapter_tag, is_pinned).
- `[ ]` **DISC-API-004**: When a thread author or admin calls `threads.delete`, the system SHALL delete the thread and all its comments.
- `[ ]` **DISC-DATA-001**: The system shall parse chapter_tag into chapter_number when the tag follows a recognizable pattern (e.g., "Chapter 5" → 5, "Ch. 12" → 12). When unparseable, chapter_number shall be null.

## Spoiler Filtering

- `[x]` **DISC-UI-001**: By default, the thread list shall hide threads tagged beyond the user's current_chapter (from their reading progress).
- `[x]` **DISC-UI-002**: The system SHALL display a count of hidden threads with the message "N threads hidden" with a "Show all anyway" override link.
- `[x]` **DISC-UI-003**: When a user clicks "Show all", the system SHALL display all threads regardless of chapter_tag. This override shall be per-session (not persistent).
- `[x]` **DISC-UI-004**: The spoiler filter bar SHALL include a chapter number input ("I'm on Chapter X") with a live update to the thread list.
- `[x]` **DISC-BE-001**: Threads with chapter_number = null (unparseable tags or no tag) shall always be shown regardless of the user's progress filter.

## Comments

- `[x]` **DISC-API-005**: When a member calls `comments.create` with optional parent_comment_id, the system SHALL create the comment nested under the parent (or at the top level if no parent).
- `[x]` **DISC-DATA-002**: Comment nesting shall be limited to one level. A comment with a parent_comment_id shall NOT be allowed to have its own children (no grandchild comments).
- `[ ]` **DISC-API-006**: When a comment author calls `comments.update`, the system SHALL update the body.
- `[ ]` **DISC-API-007**: When a comment author or admin calls `comments.delete`, the system SHALL remove it. Child comments (if any replies exist) shall remain visible with an "[deleted]" placeholder for the parent.

## Content

- `[ ]` **DISC-BE-002**: Thread bodies and comment bodies shall support CommonMark Markdown (bold, italic, links, code blocks, blockquotes, lists).
- `[ ]` **DISC-BE-003**: The system SHALL sanitize all HTML in rendered Markdown to prevent XSS.

## Design UI — Thread List & Interactions

- `[x]` **DISC-UI-005**: The thread list SHALL support sort controls (Recent / Most comments) as tab-style toggles.
- `[x]` **DISC-UI-006**: Pinned threads SHALL display with an amber background, a pin icon badge, and "PINNED" label, always sorted first regardless of sort order.
- `[x]` **DISC-UI-007**: Thread detail SHALL show edit and delete icon buttons for the thread author (and admin+), positioned in the header.
- `[x]` **DISC-UI-008**: When a comment is deleted but has replies, the system SHALL render a "[deleted]" placeholder in italics, preserving the reply tree structure.
- `[x]` **DISC-UI-009**: The comment composer at the bottom of thread detail SHALL be sticky (fixed to bottom) with a gradient fade-in mask above to avoid text overlap.
- `[x]` **DISC-UI-010**: Reply buttons on top-level comments SHALL be hidden by default and revealed on hover or keyboard focus.
- `[x]` **DISC-UI-011**: Thread list items SHALL display a single-line truncated body preview below the title.
- `[x]` **DISC-UI-012**: Thread detail SHALL include a sidebar showing metadata: chapter tag (ChapterChip), reply count from distinct authors, and thread age.
- `[x]` **DISC-UI-013**: When a user clicks "Reply" on a comment, an inline comment composer SHALL appear indented below it with a blue left border accent.

## Spoiler Mismatch Detection in Compose

- `[x]` **DISC-UI-014**: When creating a new thread, if the body text mentions chapter numbers that exceed the chapter_tag (e.g., "happens in Chapter 12" but tagged "Ch. 5"), the system SHALL detect the mismatch in real time.
- `[x]` **DISC-UI-015**: On spoiler mismatch, the body textarea SHALL display an amber border, a warning banner SHALL appear ("⚠ Possible spoiler. Your post mentions chapter N but is tagged X. Bump the tag or rephrase."), and the Post button SHALL be disabled with label "Resolve spoiler warning".
- `[x]` **DISC-UI-016**: The chapter_tag input SHALL display a live ChapterChip preview inline as the user types (e.g., showing "Ch. 5–8" as a chip).
- `[x]` **DISC-UI-017**: If no spoiler mismatch, a "💡 Spoiler-safe by default" info card SHALL explain visibility rules.

## Deferred

- `[D]` **DISC-NOTIFY-001**: The system shall notify a user when someone replies to their thread or comment.
- `[D]` **DISC-UI-004**: The system shall support emoji reactions on threads and comments.
- `[D]` **DISC-BE-004**: The system shall support full-text search across threads and comments within a book.
- `[D]` **DISC-DATA-003**: The system shall store edit history for comments, showing previous versions.
