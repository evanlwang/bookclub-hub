# Reading Progress Tracking

## Context and Design Philosophy

Reading progress serves two purposes: (1) it lets the organizer see whether the group is ready to meet, and (2) it drives the spoiler filter in discussions. Progress is self-reported — the member enters their current page or status. There is no e-reader integration.

Design philosophy: **low friction, visible but not judgmental**. The system shows aggregate progress but does not rank members or send "you're behind" notifications.

Status markers: `[x]` implemented · `[ ]` gap · `[!]` divergence · `[D]` deferred

## Update Modal Status States

State: not_started — page input: forced to 0; chapter input: editable — auto-transition: page > 0 typed → status flips to "reading"
State: reading — page input: editable, range 0..totalPages; chapter input: editable
State: finished — page input: forced to totalPages AND disabled; chapter input: editable

## Button Inventory

Button: "Update My Progress" — `update-modal.tsx:24-30` — visible: progress dashboard header — handler: opens modal
Button: status radio cards "Not Started" / "Reading" / "Finished" — `update-modal.tsx:118-139` — handler: handleStatusChange (sets status; also coerces page on enter to "finished" or "not_started")
Button: page number input — `update-modal.tsx:146-160` — disabled: status="finished"
Button: chapter number input (optional) — `update-modal.tsx:182-190`
Button: "Cancel" — `update-modal.tsx:201-203` — handler: onClose
Button: "Save my place" — `update-modal.tsx` — handler: optimistic `progress.update` (cache write + rollback, PROG-UI-OPTIMISTIC-001), then toast + onClose
Button: book selector card (per book) — `progress/page.tsx:51-76` — handler: navigates to `/clubs/[clubId]/progress?bookId={bookId}`
Button: "All books" back link — `progress/page.tsx:120-126` — handler: navigates back to `/clubs/[clubId]/progress`

## Gaps

Editable percentage input (0–100) — `[D]` deferred; percentage is a read-only computed display (PROG-UI-MODAL-PCT-001). Formerly-listed gaps now shipped: bookmark/range slider (PROG-UI-MODAL-SLIDER-001), live preview bar (PROG-UI-MODAL-PREVIEW-001), save toast with Undo (PROG-UI-MODAL-TOAST-001/-UNDO-001), and the "Last updated" timestamp (PROG-UI-MODAL-TIMESTAMP-001).

## Live Updates

Mechanism owned by `docs/llds/live-updates.md`; this segment's surfaces:

- **Dashboard member list + summary** render from a polled `progress.list` client query (60s interval, RSC-seeded `initialData` with ISO-stringified dates) so other members' updates appear without reload (PROG-DASH-LIVE-001). Row stagger animations run on first paint only — background refetches swap data in place under stable keys.
- **Progress save is optimistic** (PROG-UI-OPTIMISTIC-001): the viewer's row and `progress.me` cache rewrite in `onMutate`; rollback on error; `onSettled` invalidates. The undo toast (PROG-UI-MODAL-UNDO-001) keeps its pre-save snapshot semantics; its revert path uses invalidation instead of `router.refresh()`.

## Progress Model

```
ReadingProgress {
  id: UUID (PK)
  club_id: UUID (FK -> Club)
  book_id: UUID (FK -> Book)
  user_id: UUID (FK -> User)
  current_page: integer (nullable)
  total_pages: integer (nullable -- from Book.page_count or user override)
  percentage: integer (0-100)
  current_chapter: integer (nullable -- for spoiler filtering)
  status: enum("not_started", "reading", "finished")
  updated_at: timestamp
  UNIQUE(club_id, book_id, user_id)
}
```

Page ↔ percentage computation:
- If member enters page and totalPages is known → percentage = round(page/totalPages * 100)
- If member enters percentage and totalPages is known → page = round(percentage/100 * totalPages)
- If totalPages is null → only percentage is stored; page stays null
- If status="finished" → percentage forced to 100; page forced to totalPages (when known)

The current_chapter field is entered separately and is not derived from page (chapter lengths vary). It drives the discussion spoiler filter.

## Club Progress Dashboard

The dashboard at `/clubs/[clubId]/progress?bookId={bookId}` shows:
- A summary card with an animated SVG ring (median %), a segmented status bar (finished / reading / not_started), and a legend.
- A "Where everyone is" member list, sorted by progress, each row showing avatar, name, page/chapter info, animated progress bar, right-aligned percentage, and status badge.
- Staggered animations: ~60ms delay per row, 500ms duration, ease-out.
- A compact card variant (360px) appears on the main club dashboard as a read-only preview.

## API Contracts

| Procedure | Auth | Input | Output |
|-----------|------|-------|--------|
| `progress.list` | member | `{ clubId, bookId }` | `[{ user, progress }]` (sorted by percentage DESC) |
| `progress.me` | member | `{ clubId, bookId }` | `{ progress }` or null |
| `progress.update` | member | `{ clubId, bookId, currentPage?, percentage?, currentChapter?, status? }` | `{ progress }` (idempotent upsert) |
| `progress.summary` | member | `{ clubId, bookId }` | `{ medianPct, finishedCount, readingCount, notStartedCount, chapterDistribution }` |
| `books.listForClub` | member | `{ clubId }` | `[{ book }]` (selected books, most recent first) |

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Progress input | Page number, manually entered | E-reader sync; photo of page | Manual entry is the only approach that works across all reading formats. |
| Chapter tracking | Separate manual field | Derive from page + table of contents | Table of contents rarely available; manual entry is one number. |
| Visibility | All members see individual progress | Only organizer sees individual; everyone sees aggregate only | Visibility creates gentle social accountability in a small trusted group. |
| Progress history | No history (current state only) | Store every update | History adds storage cost for minimal value. |
| Live percentage editing | Read-only computed display | Editable input with two-way sync | (Today: read-only. Editable would require either a slider or sync logic; deferred.) |

## Open Questions

### Resolved

1. ✅ Manual entry, page-based.
2. ✅ Separate chapter field for spoiler filtering.
3. ✅ Individual progress visible to all members.

### Deferred

1. **Editable percentage input.**
2. **Audiobook progress (hours:minutes).**
3. **Progress reminders.**
4. **Historical reading pace.**

## References

- `docs/specs/prog-specs.md`
- `docs/llds/discussion-threads.md` — progress drives spoiler filtering
- `docs/llds/club-management.md`
- `docs/high-level-design.md`
