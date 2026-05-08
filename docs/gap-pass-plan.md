# Plan: Complete the BookClub Hub gap pass

## Context

The recent `/arrow-maintenance` audit (2026-05-07, HEAD `a4049976`) catalogued every spec row marked `[ ]` (active gap) or `[!]` (divergence) across `docs/specs/*.md` and the 12 audit-flagged reverse orphans (IDs cited via `@spec` but absent from any spec file). You've already cleared `prog-specs.md` to zero non-`[x]` rows and reduced `meet-specs.md` from 9 gaps to 1 plus a clean `[!]` count. This plan describes how to walk through the **remaining 67 spec rows + 12 reverse orphans** systematically and end with all six arrow segments at `OK` or `AUDITED-with-explicit-defers`.

The remaining work splits along a sharp seam:

| Bucket | Count | Action |
|---|---|---|
| Already-cited (have `@spec` in code/tests) | 22 | Marker-reconcile: read citation site, flip `[!]`/`[ ]` → `[x]` when code matches spec; otherwise route to a real-work cluster |
| Not yet cited | 45 | Real work: implement, delete, or defer |
| Reverse orphans (audit) | 12 | Per-ID: add row to spec / delete annotation / alias |

Total touch-points: **79 IDs across 7 spec files** (`auth`, `club`, `dash`, `disc`, `home`, `meet`, `vote`).

## Current per-segment state (working tree, post-your-edits)

| Spec file | `[ ]` | `[!]` | `[D]` | Notes |
|---|---|---|---|---|
| auth-specs.md | 3 | 3 | 3 | mostly verify-cookie + cadence persistence |
| club-specs.md | 11 | 3 | 2 | largest cluster — admin settings, archive lifecycle, switcher modernization |
| dash-specs.md | 8 | 1 | 2 | shares topbar / unread / chip clusters with `clubs` |
| disc-specs.md | 14 | 9 | 4 | most-drifted segment — admin/author UI cluster + Markdown + mismatch warnings |
| home-specs.md | 1 | 2 | 3 | one verify + cadence-mirror of auth |
| meet-specs.md | 1 | 0 | 1 | one progress-bar cosmetic |
| vote-specs.md | 7 | 4 | 4 | nomination pitch + winner-banner CTAs + deadline cluster |

## Execution order (six phases)

Phases A–D are mechanical doc cleanup. Phase E is feature work, executed cluster-by-cluster as LID arrow walks (per CLAUDE.md: tests-first, then code, then mark `[x]`). Phase F is the post-cleanup re-audit.

---

### Phase A — Marker reconciliation (22 IDs, ~45 min)

These rows have `@spec` citations in code or tests. Implementation likely exists; the marker is stale. For each ID:

1. `grep -rn "@spec.*<ID>" src/ tests/` to find the citation
2. Read 5–10 lines around the citation
3. Read the spec row text
4. **If code matches spec text** → flip marker to `[x]` (or rewrite the spec body to match if the divergence note says so)
5. **If code differs from spec text** → route to a Phase E cluster

The 22 IDs:
- `AUTH-API-003`, `AUTH-BE-001`, `AUTH-BE-002`, `AUTH-UI-STEP3B-CADENCE-001`
- `CLUB-BE-001`, `CLUB-BE-006`, `CLUB-UI-002`
- `DASH-UI-008`, `DASH-UI-011`
- `DISC-UI-PAGE-CARD-001`, `DISC-UI-COMPOSE-001`, `DISC-UI-DETAIL-002`, `DISC-UI-007`, `DISC-UI-006`, `DISC-UI-008`, `DISC-UI-010`, `DISC-UI-011`, `DISC-UI-012`
- `VOTE-UI-005`, `VOTE-UI-VOTE-003`, `VOTE-UI-PRIOR-VOTES-002`
- `JOIN-UI-014`

Several spec rows already say "implemented" or "confirmed `[x]`" in their body (e.g. `DISC-UI-011`, `VOTE-UI-VOTE-003`, `DISC-UI-PAGE-CARD-001`) — these are pure marker flips.

### Phase B — Cleanup deletions (3 IDs, ~5 min)

Rows the spec body already declares obsolete; the row was kept for "ID stability" only. Delete each row outright (no replacement).

- `AUTH-UI-LOGOUT-002` — body says "Row kept for ID stability… `/clubs` page was removed."
- `CLUB-NAV-MODAL-009` — body says "this row is obsolete."
- (Optionally) `CLUB-NAV-SWITCH-001` if absorbed into `CLUB-NAV-CLIENT-001` per Phase E cluster 6.

### Phase C — Verify-and-confirm (4 IDs, ~30 min)

Spec rows that explicitly ask the reader to verify behavior in code. Read the named code paths; flip `[x]` if confirmed, otherwise route to a Phase E cluster.

- `AUTH-BE-001` — verify cookie is HttpOnly + Secure + SameSite=Lax (`src/server/routers/auth.ts`)
- `AUTH-BE-002` — verify sliding expiration on each authenticated request (`src/lib/auth/`)
- `CLUB-API-004` — verify `clubs.join` still supports the unauthenticated combined-flow path (`src/server/routers/clubs.ts`)
- `JOIN-UI-JOINING-LABEL-001` — verify the join button shows "Joining…" + `aria-busy="true"` (`src/app/join/page.tsx` + `src/components/ui/Button.tsx`)

### Phase D — Reverse-orphan triage (12 IDs from audit, ~45 min)

For each ID, locate the `@spec` citation, then pick:
- **Add row to spec** — behavior is real but the EARS line was lost (most likely outcome for the meetings cluster, which looks like a mid-refactor regression in `meet-specs.md`)
- **Delete annotation** — annotation is stale (rare; usually the test was kept, the spec lost)
- **Alias to existing ID** — annotation is a typo or the spec was renamed

| Reverse orphan | Cited at | Likely action |
|---|---|---|
| `MEET-BE-CROSS-001..004` | `src/server/routers/meetings.ts`, `src/lib/meetings/` | Add to `meet-specs.md` under a "Cross-day / TZ rules" section |
| `MEET-BE-STATE-001..002` | `src/server/routers/meetings.ts` | Add under "Meeting Lifecycle" |
| `MEET-BE-TIME-001` | `src/lib/meetings/` | Add under "Time Handling" |
| `MEET-UI-002`, `MEET-UI-003` | meetings UI | Likely aliases of existing UI specs |
| `VOTE-UI-004`, `VOTE-UI-007`, `VOTE-UI-008`, `VOTE-UI-010` | voting UI / `src/lib/voting/` | Read citations; likely re-spec under existing sections |

### Phase E — Feature-work clusters (16 clusters, ~35 IDs)

Each cluster is a self-contained LID arrow walk. Per `CLAUDE.md`: HLD/LLD already cover the territory → tests-first → implement → mark `[x]` → update arrow doc. Clusters are ordered by cost-to-clear (small → large), letting cheap wins build momentum:

| # | Cluster | IDs | Files touched | Est. effort |
|---|---|---|---|---|
| 1 | Meeting response progress bar | `MEET-UI-PROP-PROGRESS-001` | `meetings-client.tsx` | 30 min |
| 2 | Nomination pitch field | `VOTE-UI-NOMMODAL-PITCH-001` | `nominate-modal.tsx`, `nominations.ts`, schema, e2e | 1 h |
| 3 | Winner-banner CTAs | `VOTE-UI-DEC-CTA-MEETING-001`, `VOTE-UI-DEC-CTA-OPENLIB-001` | `vote-round.tsx` | 30 min |
| 4 | Cadence persistence | `AUTH-UI-STEP3B-CADENCE-DATA-001`, `JOIN-UI-CREATE-CADENCE-001` | Prisma schema migration, `clubs.create`, `join/page.tsx` | 2 h |
| 5 | Real-time code lookup | `CLUB-UI-CODE-LIVE-001` | `join/page.tsx` (debounce), reuse `clubs.lookup` | 1 h |
| 6 | Client-side switcher | `CLUB-NAV-CLIENT-001` (+ retire `CLUB-NAV-SWITCH-001`) | `club-switcher-modal.tsx`, prefetch | 2–3 h |
| 7 | Banner CTA (Respond to meetings) | `DASH-UI-BANNER-CTA-MEET-001` | dashboard banner component | 30 min |
| 8 | Copyable invite chip + topbar | `DASH-UI-003` ≡ `CLUB-UI-TOPBAR-CHIP-001`, `DASH-UI-004` ≡ `CLUB-UI-TOPBAR-INVITE-001`, `DASH-UI-HEAD-COPY-001` | `clubs/[clubId]/layout.tsx` (new topbar), header tweak | 3 h |
| 9 | Progress-bar member ticks + tooltips | `DASH-UI-HERO-TICKS-001`, `DASH-UI-HERO-TOOLTIP-001` | dashboard hero progress component | 2 h |
| 10 | Unread indicator | `CLUB-NAV-UNREAD-001`, `DASH-UI-NAV-UNREAD-001` | new `last_visited_at` per (user, club, surface), badge components | 3–4 h |
| 11 | Markdown rendering + sanitization | `DISC-BE-002`, `DISC-BE-003` | thread/comment renderer, install `marked` + `DOMPurify` (or equivalent) | 2 h |
| 12 | Discussion edit/delete/pin | `DISC-UI-006/007/008`, `DISC-UI-EDIT-BTN-001`, `DISC-UI-DELETE-BTN-001`, `DISC-UI-PIN-BTN-001`, `DISC-UI-PIN-VISUAL-001`, plus wiring `DISC-API-003/004/006/007` to UI | thread header, modal, comment row | 4–6 h |
| 13 | Compose chapter-mismatch warnings | `DISC-UI-COMPOSE-MISMATCH-001..003`, `DISC-UI-COMPOSE-INFO-001` | `create-thread.tsx`, mismatch detector in `src/lib/discussions/` | 2–3 h |
| 14 | Voting deadline UI + notification | `VOTE-UI-VOTE-DEADLINE-001`, `VOTE-UI-DEADLINE-NOM-001`, `VOTE-UI-DEADLINE-VOTE-001`, `VOTE-NOTIFY-003` | round creation form, sidebar countdown, cron pipeline (already exists per `cron-deadline-reminder.test.ts`) | 4 h |
| 15 | Soft-delete + 30-day hard-delete | `CLUB-BE-004`, `CLUB-BE-005` | Prisma `deleted_at` + status field, scheduled job, admin UI | 3 h |
| 16 | Admin Settings page | `CLUB-UI-SETTINGS-001` | new `/clubs/[clubId]/settings` route, form, mutations wiring | 4–6 h |

**Total Phase E sizing: ~35–45 hours** of feature work, distributed across 16 self-contained units. Cluster 16 (Admin Settings) is the largest single feature; clusters 12 and 14 are second/third largest.

### Phase F — Re-audit + status promotion (~30 min)

After Phases A–E land:

1. `/arrow-maintenance` — incremental audit pass diffs against `audited_sha` and re-derives Spec Coverage tables
2. Promote `index.yaml` segment statuses based on remaining state:
   - All `[ ]` cleared, all `[!]` reconciled, no reverse orphans → `OK`
   - Otherwise → stay `PARTIAL` with updated `next` and `drift` fields
3. Move `tests/unit/auth/permissions.test.ts` → `tests/unit/clubs/permissions.test.ts` (audit Finding #4 — content is club-permissions, file is mislocated)
4. Decide on the 195 coverage-policy items: per-element `@spec` or accept-parent-coverage. Document the policy in CLAUDE.md once chosen.

## Per-row decision rubric

When in doubt on a single row, this is the deterministic rubric:

```
For each [ ] gap:
  - Body says "verify..." or "confirm..."   → Phase C (read code, flip [x] or escalate)
  - @spec citation exists in code/tests     → Phase A (marker-reconcile)
  - Body says "obsolete" / "ID stability"  → Phase B (delete)
  - Otherwise                               → Phase E (cluster work)

For each [!] divergence:
  - Body says "implemented" / "confirmed [x]" → Phase A (marker flip)
  - Body describes intentional re-spec        → Phase A (rewrite text + flip [x])
  - Body lists sub-IDs as the actual gap      → Phase E (real work on the sub-IDs)
  - Code is wrong vs spec                      → Phase E (fix code, then [x])

For each reverse orphan:
  - @spec citation describes real behavior     → Add row to spec file
  - @spec citation describes deleted behavior  → Delete the annotation
  - @spec ID is a typo / renamed equivalent    → Rewrite annotation to alias the real ID
```

## Critical files

**Spec files (where rows live):**
- `/Users/evanwang/Development/bookclub-hub/docs/specs/auth-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/club-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/dash-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/disc-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/home-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/meet-specs.md`
- `/Users/evanwang/Development/bookclub-hub/docs/specs/vote-specs.md`

**Arrow overlay (gets re-derived in Phase F):**
- `/Users/evanwang/Development/bookclub-hub/docs/arrows/index.yaml`
- `/Users/evanwang/Development/bookclub-hub/docs/arrows/{auth,clubs,voting,meetings,discussions,reading-progress}.md`

**Code surfaces touched by Phase E clusters (most-touched files):**
- `src/app/clubs/[clubId]/layout.tsx` (clusters 8, 10)
- `src/app/clubs/[clubId]/page.tsx` (clusters 7, 9)
- `src/app/clubs/[clubId]/discussions/{[threadId]/page.tsx, create-thread.tsx, comment-composer.tsx}` (clusters 11, 12, 13)
- `src/app/clubs/[clubId]/vote/{vote-round.tsx, nominate-modal.tsx}` (clusters 2, 3, 14)
- `src/app/clubs/[clubId]/meetings/meetings-client.tsx` (cluster 1)
- `src/app/join/page.tsx` (clusters 4, 5)
- `src/server/routers/{clubs,threads,comments,nominations,rounds}.ts` (most clusters)
- `prisma/schema.prisma` (clusters 4, 10, 14, 15)

**Existing utilities to reuse (avoid reinventing):**
- `clubs.lookup` procedure in `src/server/routers/clubs.ts` — for cluster 5 (real-time code check)
- `cron-deadline-reminder.test.ts` already exercises a deadline-pipeline scaffold — extend for cluster 14
- `src/lib/discussions/spoiler-cutoff.ts` (DISC-LIB-CUTOFF-001) — pair the new mismatch detector beside it for cluster 13
- `src/lib/meetings/availability.ts#pickMostAvailableSlot` — pattern for pure-domain helpers extracted from UI

## Verification

After all phases complete:

```bash
# 1. Confirm all spec files are clean
for f in docs/specs/*.md; do
  printf "%-32s [ ]=%d [!]=%d\n" "$(basename $f)" \
    "$(grep -cE '\`\[ \]\`' $f)" "$(grep -cE '\`\[!\]\`' $f)"
done
# Goal: every line shows [ ]=0 and [!]=0

# 2. Confirm zero reverse orphans
diff <(grep -rh "@spec " src/ tests/ | grep -oE '\b[A-Z][A-Z0-9-]+-[0-9]+\b' | sort -u) \
     <(grep -h '\*\*[A-Z][A-Z0-9-]\+-[0-9]\+\*\*' docs/specs/*.md | grep -oE '\*\*[A-Z][A-Z0-9-]+-[0-9]+\*\*' | tr -d '*' | sort -u) \
  | grep '^<'
# Goal: no output (every cited ID is declared)

# 3. Run full test suite
make seed && npm run test && npm run test:e2e

# 4. Re-run /arrow-maintenance — incremental audit should report zero drift
# 5. Confirm index.yaml shows AUDITED or OK on every segment
```

End state: every spec row is `[x]` or explicitly `[D]`, every `@spec` citation resolves to a declared ID, every arrow segment is `AUDITED` or `OK`, and `index.yaml` reflects the new HEAD as `audited_sha`.

## What this plan is not

- **Not a 1-sitting plan.** Phase E alone is 35–45 hours of feature work distributed across 16 clusters. The expected use is: knock out Phases A–D in one sitting (~2 hours total), then schedule Phase E clusters across multiple sittings — likely cheapest-first to build momentum.
- **Not a rewrite of the LID workflow.** Each Phase E cluster is just an ordinary LID arrow walk per `CLAUDE.md` (tests-first, then code, then mark `[x]`). The plan only adds: which clusters exist, which IDs belong to each, and what dependencies between clusters exist (e.g., cluster 14 needs cluster 15-style scheduled job, cluster 12 needs cluster 11 if Markdown is to render in edit forms too).
- **Not a substitute for human judgment.** The rubric handles 90% of rows mechanically. The remaining 10% — particularly which gaps to defer vs implement vs delete — is yours.
