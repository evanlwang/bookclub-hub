# Fix: atomic vote replacement in `votes.submit` (LID Phases 5–6)

## Context

`votes.submit` (`src/server/routers/votes.ts:56-68`) replaces a member's votes with `deleteMany` followed by `createMany` as two independent writes. A failure between them silently erases the member's prior votes instead of replacing them. The LID walk (phases 1–4, all user-approved) found the intent already existed but was corrupted: spec `VOTE-DATA-VOTE-PERSIST-001` demanded atomic replacement while its own parenthetical blessed the non-atomic mechanism.

Docs are already updated in the working tree (uncommitted):
- `docs/llds/book-selection-and-voting.md` — API-contract row + "Replacement atomicity" decision row + 2 new Deferred items (concurrent-resubmit merge, status-guard race).
- `docs/specs/vote-specs.md:93` — VOTE-DATA-VOTE-PERSIST-001 rewritten to require a single DB transaction; marker flipped to `[ ]` (active gap) pending implementation.

Remaining: LID Phase 5 (tests-first) and Phase 6 (code + coherence verification), then branch/commit/PR.

## Phase 5 — Tests first (must fail before code change)

File: `tests/integration/vote-persistence.test.ts`, in the existing `describe("vote persistence — replace-on-resubmit")` block. Two new tests, both annotated `// @spec VOTE-DATA-VOTE-PERSIST-001`:

1. **Replacement executes in a single transaction.** `vi.spyOn(db, "$transaction")` (the same `db` handed to `createAuthenticatedCaller` becomes `ctx.db`, so the spy observes the router). Submit an initial selection, then resubmit a different one; assert `$transaction` was called with the delete+insert batch during the resubmit. This is the falsifiable proxy for atomicity — if the code regresses to separate awaited writes, the spy sees nothing.
2. **Failed resubmit leaves the prior selection intact.** Submit an initial selection; then `mockRejectedValueOnce` on the `$transaction` spy; resubmit a different selection and expect it to reject; restore the spy and assert `db.vote.findMany` still returns the original selection (not empty, not the new one).

Also confirm the two existing replacement tests (lines 130 and 156) stay green — they pin the happy-path semantics.

Constraint from Phase 4: delete must precede insert inside the transaction (re-approving a retained nomination would trip `@@unique([roundId, nominationId, userId])` otherwise). Test 1's assertion on the batch shape need not inspect order; the unique constraint + existing idempotent-resubmit test enforces it behaviorally.

Run: `npx vitest run --config vitest.config.integration.ts tests/integration/vote-persistence.test.ts` — new tests must fail against current code (spy never called), existing ones pass.

## Phase 6 — Code

`src/server/routers/votes.ts`: replace the awaited `deleteMany` / conditional `createMany` (lines ~56-68) with Prisma's batch form, preserving statement order:

```ts
const ops = [
  ctx.db.vote.deleteMany({ where: { roundId: input.roundId, userId: ctx.user.id } }),
];
if (input.nominationIds.length > 0) {
  ops.push(ctx.db.vote.createMany({ data: ... }));
}
await ctx.db.$transaction(ops);
```

(Batch `$transaction` suffices — the delete doesn't feed the insert; no interactive transaction needed. Empty-selection submit stays legal per the Phase 4 decision.)

Annotations:
- Add `VOTE-DATA-VOTE-PERSIST-001` to the `// @spec` header at `src/server/routers/votes.ts:1` — the router is the entry point of that behavior and currently doesn't cite it.

Spec bookkeeping in `docs/specs/vote-specs.md:93`:
- Flip `[ ]` back to `[x]` and restore a current code pointer (`votes.ts:<new lines>`).

## Coherence verification (end of Phase 6)

Structural:
1. `npm run test:integration` (or at minimum the voting/vote-persistence suites) — all pass.
2. `npm run typecheck` and `npm run lint`.
3. Grep every `@spec` ID in changed files against `docs/specs/` — all exist.
4. VOTE-DATA-VOTE-PERSIST-001 has ≥1 citing test (the two new ones).

Semantic (report, non-blocking): spec ↔ LLD ↔ HLD consistency for the voting segment — expected "consistent" on all pairs; note the known unrelated re-stamp drift in `docs/arrows/index.yaml` (surfaced in pre-flight, not repaired here).

## Git workflow

Branch `fix/vote-submit-atomic-replace` (never commit to main). Commit batches: (1) docs (LLD + spec), (2) tests, (3) code + spec marker flip — or a single commit if the user prefers; single-line why-focused messages. Push and open PR to main via `gh pr create`.

Note: an ultrareview launched earlier on the working tree may deliver findings mid-implementation; relay them when they arrive.
