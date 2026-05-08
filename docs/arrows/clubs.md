# Arrow: clubs

Multi-tenancy backbone — club creation, membership, roles, the club switcher, and the per-club dashboard/navigation shell.

## Status

**PARTIAL** — last audited 2026-05-07 (git SHA `a4049976`). 19 active gaps + 4 divergences. The most-drifted segment by gap count.

## References

### HLD
- `docs/high-level-design.md` (clubs as isolated spaces, role model, club codes)

### LLD
- `docs/llds/club-management.md` — single-LLD source for both club-specs and dash-specs

### EARS
- `docs/specs/club-specs.md` (58 specs — create/join/leave, roles, members, switcher)
- `docs/specs/dash-specs.md` (28 specs — per-club dashboard layout, banner CTAs, nav)

### Tests
- `tests/integration/clubs.test.ts`
- `tests/e2e/multi-club-switching.spec.ts`
- `tests/e2e/switcher-create-join.spec.ts`
- `tests/e2e/members-management.spec.ts`
- `tests/e2e/attention-banner.spec.ts` — DASH-UI-005/006/011, DASH-UI-BANNER-VOTE-001, DASH-UI-BANNER-MEET-001, DASH-UI-BANNER-CTA-VOTE-001
- `tests/e2e/ui-interactions.spec.ts` (cross-cutting; has club nav assertions)
- `tests/unit/auth/permissions.test.ts` — CLUB-BE-002, CLUB-DATA-003 (file is mislocated; content is club-permissions, see Key Finding 4)
- `tests/unit/validation/club-code.test.ts` — CLUB-DATA-001, CLUB-DATA-002

### Code
- `src/server/routers/clubs.ts` (membership procedures live under `clubs.members.*` in the same file)
- `src/lib/validation/club-code.ts` — CLUB-DATA-001, CLUB-DATA-002
- `src/app/clubs/[clubId]/page.tsx` — dashboard (per-club home)
- `src/app/clubs/[clubId]/layout.tsx` — club-scoped layout
- `src/app/clubs/[clubId]/sidebar.tsx` — nav
- `src/app/clubs/[clubId]/members/` — member roster & roles
- `src/app/join/page.tsx` — create / join entry (also cited by `auth` for the join-flow)
- `src/components/club/club-switcher-modal.tsx` — in-place switcher

## Architecture

**Purpose:** Every other feature is scoped to a club. This segment owns the multi-tenant boundary, the join-by-code flow, role management (owner/admin/member), and the per-club shell that hosts the activity features.

**Key Components:**
1. `clubs` router — create, join-by-code, leave, ownership transfer, membership procedures
2. Per-club dashboard (`/clubs/[clubId]`) — at-a-glance banners + cards for the active book cycle
3. Sidebar / club switcher — primary navigation between clubs and within a club
4. Members page — roster view, role transitions

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| club-specs.md | 58 | 42 | 11 | 2 | 3 |
| dash-specs.md | 28 | 17 | 8 | 2 | 1 |
| **Total** | **86** | **59** | **19** | **4** | **4** |

**Summary:** 59 of 82 non-deferred specs marked implemented (72%) — the lowest implementation rate of any segment.

**Spec families:** CLUB-API, CLUB-API-OWNERSHIP, CLUB-BE, CLUB-BE-LEAVE, CLUB-DATA, CLUB-NAV (CLIENT/MEMBERS/MODAL/SWITCH/UNREAD), CLUB-UI-CODE-LIVE, CLUB-UI-OWNERSHIP, DASH-UI (HEAD/CARD-VOTE/CARD-MEET/CARD-DISC/BANNER-VOTE/BANNER-MEET/BANNER-CTA-VOTE/BANNER-CTA-MEET).

## Key Findings

1. **Highest gap count of any segment (19 active gaps)** — most likely place where intent has run ahead of implementation.
2. **Foundation for all activity segments** — `blocks: [voting, meetings, discussions, reading-progress]`. Drift here cascades.
3. **Spec-file phantom test paths** — `club-specs.md` cites `tests/e2e/clubs-*.spec.ts`; `dash-specs.md` cites `tests/e2e/dashboard-*.spec.ts`. **No files match either glob.** Real club-domain e2e specs use different names (`multi-club-switching.spec.ts`, `switcher-create-join.spec.ts`, `members-management.spec.ts`). Cascade owed in spec files.
4. **Mislocated test file** — `tests/unit/auth/permissions.test.ts` content cites `CLUB-BE-002` and `CLUB-DATA-003`; it's a club-permissions test under an auth folder. Either move file to `tests/unit/clubs/` or rename to clarify; for now, listed under `clubs` References per @spec content authority.
5. **Two spec files share one LLD** — `dash-specs.md` declares `LLD: docs/llds/club-management.md`. If dashboard surface keeps growing, consider a `clubs` ⇒ `clubs` + `dashboard` split.

## Work Required

### Must Fix
1. Reconcile 4 `[!]` divergence specs across `club-specs.md` and `dash-specs.md`.
2. Update `club-specs.md` and `dash-specs.md` `**Implementing artifacts**` headers to cite real test file names.
3. Decide on `tests/unit/auth/permissions.test.ts` — move under `tests/unit/clubs/` or accept location.

### Should Fix
4. Triage 19 active gaps — distinguish wanted-now vs deferred-but-mismarked.

### Nice to Have
5. Consider `dashboard` segment split if dash-specs surface keeps growing.
6. Promote PARTIAL → OK once gaps and divergences are addressed.
