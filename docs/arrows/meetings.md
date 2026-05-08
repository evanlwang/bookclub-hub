# Arrow: meetings

Lightweight meeting scheduling — proposed slots, member availability, organizer confirmation. Replaces Doodle-poll-in-a-group-chat.

## Status

**PARTIAL** — last audited 2026-05-07 (git SHA `a4049976`). 9 active gaps + 0 divergences + **8 reverse orphans** (largest cluster of un-declared `@spec` IDs in the project).

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
| meet-specs.md | 49 | 36 | 9 | 4 | 0 |

**Summary:** 36 of 45 non-deferred specs marked implemented (80%). Zero divergence — clean spec/code alignment on the implemented portion. The 9 gaps and the 8 reverse orphans are the focus.

**Spec families:** MEET-API, MEET-API-CREATE-VAL, MEET-API-TITLE, MEET-API-UPDATE, MEET-BE, MEET-DATA, MEET-NOTIFY, MEET-NOTIFY-REMIND, MEET-UI, MEET-UI-CANCEL-BTN, MEET-UI-CONFIRM-BADGE.

## Key Findings

1. **8 reverse orphans — largest cluster in the project**:
   - `MEET-BE-CROSS-001` through `MEET-BE-CROSS-004` (cross-day / cross-time-zone availability rules)
   - `MEET-BE-STATE-001`, `MEET-BE-STATE-002` (meeting state machine)
   - `MEET-BE-TIME-001` (time-handling)
   - `MEET-UI-002`, `MEET-UI-003`
   - All cited via `@spec` in `src/server/routers/meetings.ts` and/or `src/lib/meetings/` but absent from `meet-specs.md`. Either the spec file lost rows during a refactor, or these are aspirational IDs the implementer wrote ahead of spec authoring.
2. **Zero `[!]` divergences** — the implemented surface aligns with spec text. All drift is in the form of un-declared @spec IDs (above) and missing rows (gaps).
3. **9 active gaps** — concentrated in the second half of the meeting lifecycle (cancel/remind/edit-after-confirm).
4. **Generic UI component carries a meeting-specific @spec** — `src/components/ui/avatar-stack.tsx` cites `MEET-UI-008`. If avatar-stack gets reused outside meetings, that annotation will mislead. Worth either generalizing the spec or accepting the coupling.

## Work Required

### Must Fix
1. Resolve 8 reverse orphans — for each: add the spec, delete the annotation, or alias to an existing spec. **This is the largest single drift cluster in the project; addressing it bulk-promotes meetings toward AUDITED→OK.**

### Should Fix
2. Triage 9 `[ ]` active gaps — distinguish wanted-now from deferred-but-mismarked.

### Nice to Have
3. Decide on `MEET-UI-008` annotation in `avatar-stack.tsx` (generalize or accept).
4. Promote PARTIAL → OK.
