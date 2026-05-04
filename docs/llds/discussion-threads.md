# Discussion Threads

## Context and Design Philosophy

Discussions are the social core of a book club. This LLD covers threaded discussions attached to books, with chapter-based tagging for spoiler avoidance. The system replaces scattered group-chat conversations with organized, persistent, spoiler-aware threads.

Design philosophy: **chapter-aware, not chapter-locked**. Threads are tagged with a chapter/section marker that indicates "this discussion is about content up to chapter N." Members filter threads based on their self-reported reading progress. But the filter is advisory, not mandatory — a member can always choose to see all threads.

Traces to HLD Approach (Discussion Threads), Key Design Decision (spoiler handling), and Goal #5 (spoiler-safe discussions).

## Thread Model

A **thread** is a top-level discussion topic attached to a book within a club. A thread has a title, a chapter tag (optional), and a body (the opening post). A thread contains **comments** — replies to the thread or to other comments (one level of nesting only).

Why one level of nesting: deep nesting creates indentation hell on mobile and makes conversations hard to follow. One level (reply-to-thread or reply-to-comment) covers the useful cases. Comments replying to a comment are displayed grouped under that comment.

## Spoiler Filtering

Each thread has an optional `chapter_tag` — a string like "Chapter 5" or "Part 2" or "Epilogue". When set, the thread is considered to contain spoilers up to and including that chapter.

Each member's reading progress (from the Reading Progress LLD) includes a `current_chapter` marker. The discussion view filters out threads tagged beyond the member's progress, with a visible indicator: "3 threads hidden (beyond your current chapter)."

The member can override the filter at any time ("Show all threads — spoiler warning"). The override is per-session, not persistent.

```
┌──────────────────────────────────────────────┐
│  Discussions: Dune                           │
│  Your progress: Chapter 12 (page 187)        │
│                                              │
│  [New Thread]  Filter: [Up to my progress ▾] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ The water discipline worldbuilding     │  │
│  │ Ch. 3 · Alice · 5 comments · 2d ago   │  │
│  ├────────────────────────────────────────┤  │
│  │ Paul's prescience -- too convenient?   │  │
│  │ Ch. 10 · Bob · 12 comments · 1d ago   │  │
│  ├────────────────────────────────────────┤  │
│  │ General: Favorite quotes so far        │  │
│  │ No chapter · Carol · 3 comments · 3h  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⚠ 2 threads hidden (beyond Chapter 12)      │
│  [Show all -- spoilers ahead]                │
└──────────────────────────────────────────────┘
```

## Data Model

```
DiscussionThread {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book)
  author_id: UUID (FK -> User)
  title: string (max 200 chars)
  body: text
  chapter_tag: string (nullable -- free-form: "Chapter 5", "Part 2", "Pages 1-50")
  chapter_number: integer (nullable -- parsed from chapter_tag for filtering; null if unparseable)
  is_pinned: boolean (default false)
  created_at: timestamp
  updated_at: timestamp
}

Comment {
  id: UUID (PK)
  thread_id: UUID (FK -> DiscussionThread)
  parent_comment_id: UUID (FK -> Comment, nullable -- null = top-level reply)
  author_id: UUID (FK -> User)
  body: text
  created_at: timestamp
  updated_at: timestamp
}
```

The `chapter_number` field is derived from `chapter_tag` when possible (e.g., "Chapter 5" → 5, "Part 2" → 2). When the tag is free-form and unparseable (e.g., "Epilogue"), `chapter_number` is null and the thread is always shown (not filterable by progress). The thread creation UI encourages structured input but allows free text.

## API Endpoints

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/clubs/:clubId/books/:bookId/threads` | GET | member | `?max_chapter=N&sort=recent\|active` | 200 `[{ thread, comment_count, latest_comment_at }]` |
| `/api/clubs/:clubId/books/:bookId/threads` | POST | member | `{ title, body, chapter_tag? }` | 201 `{ thread }` |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId` | GET | member | - | 200 `{ thread, comments }` |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId` | PATCH | author or admin+ | `{ title?, body?, chapter_tag?, is_pinned? }` | 200 |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId` | DELETE | author or admin+ | - | 200 |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId/comments` | POST | member | `{ body, parent_comment_id? }` | 201 `{ comment }` |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId/comments/:commentId` | PATCH | author | `{ body }` | 200 |
| `/api/clubs/:clubId/books/:bookId/threads/:threadId/comments/:commentId` | DELETE | author or admin+ | - | 200 |

The `max_chapter` query parameter implements spoiler filtering server-side. The client passes the user's current chapter number; the server returns only threads where `chapter_number IS NULL OR chapter_number <= max_chapter`. The "show all" override omits this parameter.

## Content Format

Thread bodies and comment bodies are plain text with Markdown support (CommonMark subset: bold, italic, links, code blocks, blockquotes, lists). No image uploads in v1 — members can link to external images. HTML is sanitized server-side.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Spoiler mechanism | Chapter-tagged threads with progress-based filtering | Spoiler tags (inline hidden text); no spoiler system; AI-based detection | Chapter tags are structural and predictable. Inline spoiler tags are easy to forget. AI detection is unreliable. |
| Comment nesting | One level (reply to thread or reply to comment) | Flat (all replies at same level); unlimited nesting | One level gives enough structure without creating unreadable deep threads on mobile. |
| Thread ownership | Author can edit/delete own; admin can delete any | Only admin can delete; no deletion | Author ownership is standard. Admin override handles moderation. |
| Content format | Markdown (CommonMark subset) | Rich text editor; plain text only | Markdown is lightweight and renders consistently. Rich text editors are heavy. Plain text is too limiting. |
| Chapter tag format | Free-form string + parsed integer | Structured dropdown; page ranges only | Free-form accommodates books with non-numeric structure (Part I, Prologue, etc.). |

## Open Questions & Future Decisions

### Resolved

1. ✅ Chapter-tagged spoiler filtering.
2. ✅ One level of comment nesting.
3. ✅ Markdown content.

### Deferred

1. **Notification on reply.** Notify a user when someone replies to their thread or comment. Needs per-thread mute preferences.
2. **Thread reactions (emoji).** Lightweight engagement without a full comment.
3. **Thread search.** Full-text search across threads and comments within a book.
4. **Edit history.** Show previous versions of edited comments.

## References

- `docs/high-level-design.md`
- `docs/llds/club-management.md` — threads are club-scoped
- `docs/llds/reading-progress.md` — progress drives spoiler filtering
- `docs/specs/disc-specs.md`
