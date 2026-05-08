# Arrow: discussions

Threaded book discussions, chapter-tagged for spoiler filtering. Members filter by self-reported reading progress.

## Status

**PARTIAL** — last audited 2026-05-07 (git SHA `a4049976`). 14 active gaps + 9 `[!]` divergences (most divergent segment in the project). Reference coherence in good shape after this audit; semantic spec/code drift requires per-spec reconciliation.

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
- `src/lib/validation/chapter-tag.ts` — DISC-DATA-001
- `src/components/ui/chapter-chip.tsx` — DISC-API-001, DISC-DATA-001, DISC-UI-012 (chapter-tag presentation)
- `src/app/clubs/[clubId]/discussions/page.tsx` — thread list
- `src/app/clubs/[clubId]/discussions/[threadId]/page.tsx` — thread detail
- `src/app/clubs/[clubId]/discussions/create-thread.tsx`
- `src/app/clubs/[clubId]/discussions/comment-composer.tsx`

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
| disc-specs.md | 66 | 39 | 14 | 4 | 9 |

**Summary:** 39 of 62 non-deferred specs marked implemented (63%). 14 gaps and 9 divergences make this the **most-drifted segment** by raw counts.

**Spec families:** DISC-API, DISC-API-LIST-SORT, DISC-BE, DISC-DATA, DISC-LIB-CUTOFF, DISC-NOTIFY, DISC-UI, DISC-UI-COMMENT-CONTROLS, DISC-UI-COMMENT-DELETE, DISC-UI-COMMENT-DELETED, plus reply/edit families.

## Key Findings

1. **Highest divergence count in the project (9 `[!]`)** — the spec/code relationship has drifted most here. Until reconciled, treating spec text as authoritative is unsafe.
2. **High gap count (14)** — likely reflects features added after initial spec round (edit/delete/reply enhancements visible in e2e test names: `comment-edit-delete`, `comment-reply`, `discussion-enhancements`).
3. **Strong test coverage** — six dedicated e2e specs plus integration + spoiler-cutoff unit test. The surface has been actively exercised.
4. **Spec-file phantom test paths** — `disc-specs.md` cites `tests/integration/threads.test.ts` (does not exist; real is `tests/integration/discussions.test.ts`) and `tests/e2e/discussions-*.spec.ts` glob (no files match; real names are `comment-*.spec.ts`, `create-thread.spec.ts`, `discussion-enhancements.spec.ts`, `spoiler-safe-discussion.spec.ts`). Cascade owed in spec file.

## Work Required

### Must Fix
1. Reconcile 9 `[!]` divergences — the project's largest semantic-drift cluster. For each: read code, read spec text, decide which is authoritative, cascade.
2. Update `disc-specs.md` `**Implementing artifacts**` header to cite real test paths.

### Should Fix
3. Triage 14 `[ ]` active gaps.

### Nice to Have
4. After AUDITED, this is the second-best `/differential-audit` candidate (after voting): `DISC-LIB-CUTOFF-*` is invariant-rich.
5. Promote PARTIAL → OK.
