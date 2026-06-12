# Arrow: clubs

Multi-tenancy backbone — club creation, membership, roles, the club switcher, and the per-club dashboard/navigation shell.

## Status

**OK** — last audited 2026-05-10 (git SHA `aee095b6`). 0 active gaps, 0 divergences, 0 reverse orphans. Soft-delete + 30d hard-delete cron, archive/unarchive mutations, Admin Settings page, real-time code lookup, unread indicators, and switcher-prefetch all landed in Phase E.

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
- `src/server/routers/clubs.ts` (membership procedures live under `clubs.members.*` in the same file; new `archive`/`unarchive`/`markDiscussionsVisited`/`unreadDiscussionCounts` mutations added in Phase E)
- `src/lib/validation/club-code.ts` — CLUB-DATA-001, CLUB-DATA-002
- `src/app/clubs/[clubId]/page.tsx` — dashboard (per-club home)
- `src/app/clubs/[clubId]/layout.tsx` — club-scoped layout (now passes `unreadDiscussionCounts` to sidebar)
- `src/app/clubs/[clubId]/sidebar.tsx` — nav (with unread badges + Settings link)
- `src/app/clubs/[clubId]/members/` — member roster & roles
- `src/app/clubs/[clubId]/settings/page.tsx`, `settings-form.tsx` — Admin Settings (CLUB-UI-SETTINGS-001)
- `src/app/api/cron/hard-delete-clubs/route.ts` — 30-day hard-delete cron (CLUB-BE-005)
- `src/app/join/page.tsx` — create / join entry, with live code-availability lookup (CLUB-UI-CODE-LIVE-001)
- `src/components/club/club-switcher-modal.tsx` — in-place switcher with prefetch on already-member resolution

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
| club-specs.md | 63 | 58 | 0 | 5 | 0 |
| dash-specs.md | 28 | 24 | 0 | 4 | 0 |
| **Total** | **84** | **76** | **0** | **8** | **0** |

**Summary:** 100% of non-deferred specs implemented (76/76). Two rows were retired during gap pass (AUTH-UI-LOGOUT-002 was actually `auth`, not club; club lost CLUB-NAV-MODAL-009 + CLUB-NAV-SWITCH-001 to deletion + sub-ID promotion). 8 deferreds: topbar variants (DASH-UI-003/004 + aliases) and dashboard polish.

**Spec families:** CLUB-API, CLUB-API-OWNERSHIP, CLUB-BE, CLUB-BE-LEAVE, CLUB-DATA, CLUB-NAV (CLIENT/MEMBERS/MODAL/SWITCH/UNREAD), CLUB-UI-CODE-LIVE, CLUB-UI-OWNERSHIP, DASH-UI (HEAD/CARD-VOTE/CARD-MEET/CARD-DISC/BANNER-VOTE/BANNER-MEET/BANNER-CTA-VOTE/BANNER-CTA-MEET).

## Key Findings

1. **Foundation for all activity segments** — `blocks: [voting, meetings, discussions, reading-progress]`. Drift here cascades, so the OK promotion gates the rest.
2. **Membership data model gained `lastVisitedDiscussions`** (cluster 10) — the unread-indicator surface lives across `unreadDiscussionCounts` query, `markDiscussionsVisited` mutation, and per-(user,club) sidebar badges.
3. **Mislocated test file** — `tests/unit/auth/permissions.test.ts` content cites `CLUB-BE-002` and `CLUB-DATA-003`; the file is under an auth folder. Listed in References per @spec content authority. Future cleanup: move to `tests/unit/auth/permissions.test.ts` (mislocated) or rename.

## Work Required

### Nice to Have
1. Move `tests/unit/auth/permissions.test.ts` → `tests/unit/auth/permissions.test.ts (club permissions; mislocated under auth/)` (mislocation; not a coherence issue).
2. Surface archive/unarchive in Admin Settings UI (mutations exist; no UI button yet).
3. Wire `hard-delete-clubs` cron in deployment scheduler (`vercel.json`).
