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
- `[x]` **DISC-UI-002**: The system SHALL display a count of hidden threads with the message "N threads hidden (beyond Chapter X)".
- `[x]` **DISC-UI-003**: When a user clicks "Show all", the system SHALL display all threads regardless of chapter_tag. This override shall be per-session (not persistent).
- `[x]` **DISC-BE-001**: Threads with chapter_number = null (unparseable tags or no tag) shall always be shown regardless of the user's progress filter.

## Comments

- `[x]` **DISC-API-005**: When a member calls `comments.create` with optional parent_comment_id, the system SHALL create the comment nested under the parent (or at the top level if no parent).
- `[x]` **DISC-DATA-002**: Comment nesting shall be limited to one level. A comment with a parent_comment_id shall NOT be allowed to have its own children (no grandchild comments).
- `[ ]` **DISC-API-006**: When a comment author calls `comments.update`, the system SHALL update the body.
- `[ ]` **DISC-API-007**: When a comment author or admin calls `comments.delete`, the system SHALL remove it. Child comments (if any replies exist) shall remain visible with an "[deleted]" placeholder for the parent.

## Content

- `[ ]` **DISC-BE-002**: Thread bodies and comment bodies shall support CommonMark Markdown (bold, italic, links, code blocks, blockquotes, lists).
- `[ ]` **DISC-BE-003**: The system SHALL sanitize all HTML in rendered Markdown to prevent XSS.

## Design UI (from prototype)

- `[ ]` **DISC-UI-005**: The thread list SHALL support sort controls (Recent / Most comments) as tab-style toggles.
- `[ ]` **DISC-UI-006**: Pinned threads SHALL display with a pin icon and "PINNED" label, sorted above non-pinned threads regardless of sort order.
- `[ ]` **DISC-UI-007**: Thread detail SHALL show edit and delete icon buttons for the thread author (and admin), positioned in the header.
- `[ ]` **DISC-UI-008**: When a comment is deleted but has replies, the system SHALL render a "[deleted]" placeholder preserving the reply tree structure.
- `[ ]` **DISC-UI-009**: The comment composer SHALL be sticky to the bottom of the thread detail view with a gradient fade-mask above.
- `[ ]` **DISC-UI-010**: Reply buttons on comments SHALL be hidden by default and revealed on hover or keyboard focus.
- `[ ]` **DISC-UI-011**: Thread list items SHALL display a single-line truncated body preview below the title.
- `[ ]` **DISC-UI-012**: Thread detail SHALL include a sidebar with "About this thread" metadata (chapter, reply count, age).

## Deferred

- `[D]` **DISC-NOTIFY-001**: The system shall notify a user when someone replies to their thread or comment.
- `[D]` **DISC-UI-004**: The system shall support emoji reactions on threads and comments.
- `[D]` **DISC-BE-004**: The system shall support full-text search across threads and comments within a book.
- `[D]` **DISC-DATA-003**: The system shall store edit history for comments, showing previous versions.
