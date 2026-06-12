# Arrow: reading-progress

Self-reported reading progress — page/chapter/percentage/status. Drives the spoiler filter in discussions and the "are we ready to meet?" signal for organizers.

## Status

**OK** — last audited 2026-05-10 (git SHA `aee095b6`). 0 active gaps, 0 divergences, 0 reverse orphans. Was already the most coverage-complete segment at first audit; the single divergence was resolved during user gap-pass.

## References

### HLD
- `docs/high-level-design.md` (progress as low-friction signal, drives spoiler filter, no e-reader integration)

### LLD
- `docs/llds/reading-progress.md`

### EARS
- `docs/specs/prog-specs.md` (62 specs — page/chapter/percentage update flow, audio handling, history, spoof guards, notify)

### Tests
- `tests/integration/progress.test.ts`
- `tests/e2e/progress-dashboard.spec.ts`
- `tests/e2e/progress-history.spec.ts`
- `tests/e2e/progress-membership-403.spec.ts`
- `tests/e2e/progress-modal-last-updated.spec.ts`
- `tests/e2e/progress-modal-preview.spec.ts`
- `tests/e2e/progress-modal-slider.spec.ts`
- `tests/e2e/progress-toast.spec.ts`
- `tests/e2e/progress-update.spec.ts`
- `tests/e2e/spoiler-safe-progress.spec.ts` (cross-segment with discussions)
- `tests/unit/progress/compute.test.ts` — PROG-BE-001/002/003/005/006

### Code
- `src/server/routers/progress.ts` — update procedures, history
- `src/server/routers/books.ts` — `listForClub` (book metadata that progress hangs off; also referenced from `voting`)
- `src/lib/progress/` — page→percentage math, chapter normalization
- `src/app/clubs/[clubId]/progress/page.tsx` — aggregate dashboard
- `src/app/clubs/[clubId]/progress/update-modal.tsx` — per-member update form

## Architecture

**Purpose:** Members self-report progress in whichever unit fits the format (page, percentage, chapter, status — including "audio"). Aggregate is visible to the club but never ranked. Output is consumed by the discussion spoiler-cutoff library and by the meeting "ready?" signal.

**Key Components:**
1. `progress` router — update, list, history, spoof-prevention guards
2. Page → percentage math (`src/lib/progress/`) — book length normalization
3. Audio handling — `PROG-BE-AUDIO` family treats audiobooks differently
4. History (`PROG-BE-HISTORY`) — keeps prior reports for trend display

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| prog-specs.md | 61 | 61 | 0 | 0 | 0 |

**Summary:** 100% of specs implemented (53/53). User gap-pass cleaned up the deferred-but-superseded rows from prior audit (8 `[D]` removed when the inline history picker fully replaced the old book-grid surface).

**Spec families:** PROG-API, PROG-BE, PROG-BE-AUDIO, PROG-BE-HISTORY, PROG-BE-SPOOF, PROG-DATA, PROG-ERR, PROG-NOTIFY, PROG-UI, PROG-UI-BOOK.

## Key Findings

1. **First segment to fully clear and stay clean.** Reached OK without any Phase E work — the user's gap pass on `prog-specs.md` retired the legacy book-grid deferreds (replaced by the inline history picker) and the single `[!]` divergence.
2. **Downstream consumer of voting** (current book) and **upstream provider to discussions** (spoiler cutoff) — coherence here is load-bearing for both.
3. **Reference coherence intact** — every cited path resolves.

## Work Required

No active items. The segment is the simplest to reason about and least likely to drift on incidental changes.
