# Arrow: meetings

Lightweight meeting scheduling — proposed slots, member availability, organizer confirmation. Replaces Doodle-poll-in-a-group-chat.

## Status

**OK** — last audited 2026-06-11 (git SHA `ec02705`). 0 active gaps, 0 divergences, 0 reverse orphans. Phase D declared the 7 server-side guard specs (`MEET-BE-CROSS-001..004`, `MEET-BE-STATE-001/002`, `MEET-BE-TIME-001`); Phase E cluster 1 added the response progress bar.

## References

### HLD
- `docs/high-level-design.md` (meetings as the second-highest-friction activity, lightweight-not-calendar-app philosophy)

### LLD
- `docs/llds/meeting-scheduling.md`

### EARS
- `docs/specs/meet-specs.md` (49 specs — propose, respond, confirm, cancel, remind)

### Tests
- `tests/integration/meetings.test.ts`
- `tests/integration/meetings-security.test.ts`
- `tests/e2e/meeting-confirm.spec.ts`
- `tests/e2e/meeting-create-respond.spec.ts`
- `tests/e2e/meeting-filters.spec.ts`
- `tests/e2e/meeting-scheduling.spec.ts`
- `tests/unit/meetings-availability.test.ts` — MEET-UI-CONFIRM-BADGE-001 and adjacent availability rules

### Code
- `src/server/routers/meetings.ts` — propose / respond / confirm / cancel / remind
- `src/lib/meetings/` — scheduling helpers
- `src/components/ui/avatar-stack.tsx` — MEET-UI-008 (response-avatar stack used in meeting list)
- `src/app/clubs/[clubId]/meetings/page.tsx` — meeting list/detail shell
- `src/app/clubs/[clubId]/meetings/meetings-client.tsx` — interactive client component
- `src/app/clubs/[clubId]/meetings/create-meeting.tsx` — propose new meeting
- `src/app/clubs/[clubId]/meetings/respond-meeting.tsx` — availability submission

## Architecture

**Purpose:** A meeting has proposed slots; members mark availability per slot; the organizer confirms one slot. No external calendar integration in v1; no recurrence; time zones are display-only.

**Key Components:**
1. `meetings` router — propose, respond, confirm, cancel, remind
2. `respond-meeting.tsx` — per-member availability UI
3. `create-meeting.tsx` — propose multi-slot poll
4. Notify hooks — `MEET-NOTIFY-REMIND` family signals reminder cadence

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| meet-specs.md | 51 | 50 | 0 | 1 | 0 |

**Summary:** 100% of non-deferred specs implemented (44/44). 1 deferred (`MEET-UI-CONFIRM-RECOMMEND-001` — superseded by the "Most available" badge).

**Spec families:** MEET-API, MEET-API-CREATE-VAL, MEET-API-TITLE, MEET-API-UPDATE, MEET-BE, MEET-DATA, MEET-NOTIFY, MEET-NOTIFY-REMIND, MEET-UI, MEET-UI-CANCEL-BTN, MEET-UI-CONFIRM-BADGE.

## Key Findings

1. **Reverse orphans cleared in Phase D** — the 7 server-side guards (`MEET-BE-CROSS-001..004`, `MEET-BE-STATE-001/002`, `MEET-BE-TIME-001`) are now declared in `meet-specs.md` under "Server-side Guards". `MEET-UI-002/003` (annotation-only references) were dropped from the e2e spec header.
2. **Response progress bar** (cluster 1) — `ResponseProgress` in `meetings-client.tsx` overlays an amber→green gradient revealed via `clip-path` on the proposed-meeting row. First "OK" segment of Phase E.
3. **Generic-component coupling** — `src/components/ui/avatar-stack.tsx` carries `MEET-UI-008`. If reused outside meetings, the annotation becomes misleading. Acceptable today; revisit if avatar-stack grows other callers.

## Work Required

### Nice to Have
1. Decide on `MEET-UI-008` annotation in `avatar-stack.tsx` (generalize or accept).
