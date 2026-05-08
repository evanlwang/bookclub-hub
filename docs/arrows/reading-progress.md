# Arrow: reading-progress

Self-reported reading progress — page/chapter/percentage/status. Drives the spoiler filter in discussions and the "are we ready to meet?" signal for organizers.

## Status

**AUDITED** — last audited 2026-05-07 (git SHA `a4049976`). 0 active gaps + 1 `[!]` divergence + 0 reverse orphans. The most coverage-complete segment in the project; one decision away from `OK`.

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
| prog-specs.md | 62 | 53 | 0 | 8 | 1 |

**Summary:** 53 of 54 non-deferred specs marked implemented (98%) — **the most coverage-complete segment in the project.** Zero active gaps. Only 1 divergence to reconcile.

**Spec families:** PROG-API, PROG-BE, PROG-BE-AUDIO, PROG-BE-HISTORY, PROG-BE-SPOOF, PROG-DATA, PROG-ERR, PROG-NOTIFY, PROG-UI, PROG-UI-BOOK.

## Key Findings

1. **Closest to OK status of any segment** — one divergence away from full coherence on the active surface.
2. **Eight specs marked deferred** — audio-specific edge cases and history-display polish; deliberate deprioritization rather than drift.
3. **Downstream consumer of voting** (current book) and **upstream provider to discussions** (spoiler cutoff) — coherence here is load-bearing for both.
4. **Reference coherence intact** — every cited path resolves; no phantom test files in `prog-specs.md` artifact header.

## Work Required

### Must Fix
1. Reconcile the single `[!]` divergence — promotes AUDITED → OK.

### Should Fix
*(none — zero active gaps)*

### Nice to Have
2. Re-evaluate the 8 `[D]` deferred specs — confirm still wanted-eventually vs can be retired.
