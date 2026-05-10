# Arrow: discussions

Threaded book discussions, chapter-tagged for spoiler filtering. Members filter by self-reported reading progress.

## Status

**OK** — last audited 2026-05-10 (git SHA `aee095b6`). 0 active gaps, 0 divergences, 0 reverse orphans. Phase E added Markdown rendering + sanitization (cluster 11), thread edit/delete/pin (cluster 12), chapter-mismatch warnings (cluster 13), and unread-discussions tracking (cluster 10).

## References

### HLD
- `docs/high-level-design.md` (discussion as the social core, chapter-aware-not-locked filtering)

### LLD
- `docs/llds/discussion-threads.md`

### EARS
- `docs/specs/disc-specs.md` (66 specs — threads, comments, edit/delete, spoiler cutoff, notify)

### Tests
- `tests/integration/discussions.test.ts`
- `tests/e2e/comment-edit-delete.spec.ts`
- `tests/e2e/comment-reply.spec.ts`
- `tests/e2e/create-thread.spec.ts`
- `tests/e2e/discussion-enhancements.spec.ts`
- `tests/e2e/spoiler-safe-discussion.spec.ts`
- `tests/unit/discussions-spoiler-cutoff.test.ts` — DISC-LIB-CUTOFF-001
- `tests/unit/validation/chapter-tag.test.ts` — DISC-DATA-001

### Code
- `src/server/routers/threads.ts` — thread CRUD, list, sort
- `src/server/routers/comments.ts` — comment + reply + edit + delete + soft-delete
- `src/lib/discussions/` — chapter-cutoff / spoiler-safety helpers
- `src/lib/discussions/markdown.ts` — CommonMark renderer + DOMPurify sanitizer (DISC-BE-002, DISC-BE-003)
- `src/lib/discussions/chapter-mismatch.ts` — body-vs-tag chapter mismatch detector (DISC-UI-COMPOSE-MISMATCH-001)
- `src/lib/validation/chapter-tag.ts` — DISC-DATA-001
- `src/components/ui/chapter-chip.tsx` — DISC-API-001, DISC-DATA-001, DISC-UI-012 (chapter-tag presentation)
- `src/app/clubs/[clubId]/discussions/page.tsx` — thread list (with PINNED badges + visit-mark on mount)
- `src/app/clubs/[clubId]/discussions/[threadId]/page.tsx` — thread detail (Markdown render + edit/delete/pin)
- `src/app/clubs/[clubId]/discussions/create-thread.tsx` — chapter-mismatch warnings
- `src/app/clubs/[clubId]/discussions/comment-composer.tsx`
- `src/app/clubs/[clubId]/discussions/mark-visited.tsx` — calls `clubs.markDiscussionsVisited` on mount (CLUB-NAV-UNREAD-001, DASH-UI-NAV-UNREAD-001)

## Architecture

**Purpose:** Threaded discussions tagged with a chapter/section marker. The spoiler filter is *advisory* (members can opt to see all) — readers' self-reported progress determines the default cutoff.

**Key Components:**
1. `threads` router — create/list/sort threads, chapter tag
2. `comments` router — comment + reply + edit + delete + soft-delete tombstone
3. Spoiler-cutoff library (`src/lib/discussions/`) — translates a reader's progress into a chapter ceiling
4. Chapter-tag validation (`src/lib/validation/chapter-tag.ts`, `src/components/ui/chapter-chip.tsx`) — input validation + presentation
5. Notify hooks — `DISC-NOTIFY` family signals when contributors should be pinged

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| disc-specs.md | 66 | 62 | 0 | 4 | 0 |

**Summary:** 100% of non-deferred specs implemented (62/62). 4 deferreds: minor polish.

**Spec families:** DISC-API, DISC-API-LIST-SORT, DISC-BE, DISC-DATA, DISC-LIB-CUTOFF, DISC-NOTIFY, DISC-UI, DISC-UI-COMMENT-CONTROLS, DISC-UI-COMMENT-DELETE, DISC-UI-COMMENT-DELETED, plus reply/edit families.

## Key Findings

1. **From most-drifted to OK in one phase** — 9 divergences and 14 gaps cleared via Phase A marker reconciliation + Phase E feature work (Markdown rendering, edit/delete/pin, mismatch warnings).
2. **Two new lib helpers** added by Phase E: `src/lib/discussions/markdown.ts` (CommonMark + DOMPurify) and `src/lib/discussions/chapter-mismatch.ts` (detects body-mentioned-chapter > tag-chapter).
3. **Strong test coverage** — six dedicated e2e specs plus integration + spoiler-cutoff unit test. Add'l unit-test coverage of `chapter-mismatch.ts` would harden the segment further.

## Work Required

### Nice to Have
1. Run `/lid-experimental:differential-audit` on `DISC-LIB-CUTOFF-001` and the new `DISC-UI-COMPOSE-MISMATCH-*` family — both are invariant-rich and ideal for the bidirectional differential.
2. Add a unit test for `src/lib/discussions/chapter-mismatch.ts` covering edge cases (no chapter mention, ranges like "Ch. 5–7", lowercase variants).
