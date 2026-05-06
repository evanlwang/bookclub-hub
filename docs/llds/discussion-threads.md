# Discussion Threads

## Context and Design Philosophy

Discussions are the social core of a book club. This LLD covers threaded discussions attached to books, with chapter-based tagging for spoiler avoidance.

Design philosophy: **chapter-aware, not chapter-locked**. Threads are tagged with a chapter/section marker that indicates "this discussion is about content up to chapter N." Members filter threads based on their self-reported reading progress. The filter is advisory, not mandatory — a member can always choose to see all threads.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Discussion State

State: thread list — buttons shown: "New Thread", chapter input, "Show all" (when hidden > 0), "Recent" / "Most comments" sort, thread cards
State: compose form — buttons shown: title/body/chapter inputs, ChapterChip preview, "Cancel", "Post Thread"
State: thread detail — buttons shown: per-comment "Reply", reply composer ("Cancel"+"Post"), sticky bottom composer ("Post")

## Button Inventory

Button: "New Thread" — `create-thread.tsx:21-28` — visible: discussions page when form not open — handler: opens CreateThreadForm
Button: "Cancel" (compose) — `create-thread.tsx:140-141` — handler: closes form
Button: "Post Thread" — `create-thread.tsx:143-151` — handler: `threads.create`
Button: "I'm on chapter:" number input — `discussions/page.tsx:123-133` — handler: setMaxChapter; resets showAll
Button: "Show all" — `discussions/page.tsx:138-144` — visible: hiddenCount > 0 AND !showAll — handler: setShowAll(true)
Button: "Recent" / "Most comments" sort — `discussions/page.tsx:153-166` — handler: setSort
Button: thread card (link to detail) — `discussions/page.tsx:178-209`
Button: per-comment "Reply" — `[threadId]/page.tsx:150-161` — handler: toggle replyingTo
Button: "Cancel" (reply composer) — `comment-composer.tsx:74-77` — visible: when onCancel prop provided — handler: closes inline composer
Button: "Post" (composer) — `comment-composer.tsx:79-87` — enabled: body.trim().length > 0 — handler: `comments.create`

## Gaps (older spec described, not implemented)

Edit/delete icons on thread header (author/admin) — `[ ]` not in UI.
Admin pin toggle and pinned thread visual — `[ ]` not in UI.
"[deleted]" placeholder for deleted comments — `[ ]` no delete UI.
Hover/focus reveal of Reply buttons — `[!]` Reply is always visible.
Real-time spoiler-mismatch detection in compose — `[ ]` not implemented.
Warning banner + disabled "Resolve spoiler warning" Post — `[ ]` not implemented.
"💡 Spoiler-safe by default" info card in compose — `[ ]` not implemented.
Markdown rendering — `[ ]` bodies render as plain text (whitespace-pre-wrap).
Thread detail sidebar metadata — `[ ]` metadata is inline in the header instead.

## Thread Model

A **thread** is a top-level discussion topic attached to a book within a club. A thread has a title, an optional chapter tag, and a body. A thread contains **comments** — replies to the thread or to other comments (one level of nesting only).

```
DiscussionThread {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book)
  author_id: UUID (FK -> User)
  title: string (max 200 chars)
  body: text
  chapter_tag: string (nullable -- free-form: "Chapter 5", "Part 2", "Pages 1-50")
  chapter_number: integer (nullable -- parsed from chapter_tag; null if unparseable)
  is_pinned: boolean (default false)
  created_at: timestamp
  updated_at: timestamp
}

Comment {
  id: UUID (PK)
  thread_id: UUID (FK -> DiscussionThread)
  parent_comment_id: UUID (FK -> Comment, nullable -- null = top-level)
  author_id: UUID (FK -> User)
  body: text
  created_at: timestamp
  updated_at: timestamp
}
```

## Spoiler Filtering

Each thread has an optional `chapter_tag`. When set, the thread is considered to contain spoilers up to and including that chapter. The discussion list passes a `maxChapter` filter to `threads.list`; the server returns only threads where `chapter_number IS NULL OR chapter_number <= maxChapter`. The "Show all" override omits the filter and is per-session (not persisted).

Threads with unparseable `chapter_tag` (and therefore null `chapter_number`) are always shown.

## API Contracts

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `threads.list` | member | `{ clubId, bookId, maxChapter?, sort? }` | `{ threads, hiddenCount }` |
| `threads.create` | member | `{ clubId, bookId, title, body, chapterTag? }` | `{ thread }` |
| `threads.get` | member | `{ clubId, threadId }` | `{ thread, comments }` |
| `threads.update` | author or admin+ | `{ clubId, threadId, title?, body?, chapterTag?, isPinned? }` | `{ thread }` (no UI calls this) |
| `threads.delete` | author or admin+ | `{ clubId, threadId }` | - (no UI calls this) |
| `comments.create` | member | `{ clubId, threadId, body, parentCommentId? }` | `{ comment }` |
| `comments.update` | author | `{ clubId, commentId, body }` | `{ comment }` (no UI calls this) |
| `comments.delete` | author or admin+ | `{ clubId, commentId }` | - (no UI calls this) |

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Spoiler mechanism | Chapter-tagged threads with progress-based filtering | Inline spoiler tags; AI detection; no system | Chapter tags are structural and predictable. |
| Comment nesting | One level | Flat; unlimited | One level gives structure without indentation hell. |
| Thread ownership | Author can edit/delete own; admin can delete any | Admin only; no deletion | Standard ownership pattern. (UI not yet built.) |
| Content format | Markdown (CommonMark subset) — *target* | Rich text editor; plain text only | Today: plain text (whitespace-pre-wrap). Markdown rendering is a deferred upgrade. |
| Chapter tag format | Free-form string + parsed integer | Structured dropdown; page ranges only | Free-form accommodates Prologue, Part I, etc. |
| Reply button visibility | Always visible (current) | Hover/focus revealed (older spec) | Always visible is mobile-friendly and discoverable. |

## Open Questions

### Resolved

1. ✅ Chapter-tagged spoiler filtering with per-session override.
2. ✅ One level of comment nesting.
3. ✅ Free-form chapter tag with parsed `chapter_number`.

### Deferred

1. **Edit/delete UI for threads and comments.**
2. **Pin toggle and pinned-thread visuals.**
3. **Markdown rendering.**
4. **Real-time spoiler-mismatch detection in compose.**
5. **Notification on reply.**
6. **Thread reactions (emoji).**
7. **Thread search.**
8. **Edit history.**

## References

- `docs/specs/disc-specs.md`
- `docs/llds/club-management.md`
- `docs/llds/reading-progress.md` — progress drives spoiler filtering
- `docs/high-level-design.md`
