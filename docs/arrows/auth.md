# Arrow: auth

Identity, sessions, the join/login flow, and the marketing landing page.

## Status

**PARTIAL** — last audited 2026-05-07 (git SHA `a4049976`). 5 `[!]` divergences and 4 `[ ]` active gaps; 0 reverse orphans. Coverage links largely intact after this audit; specific findings below.

## References

### HLD
- `docs/high-level-design.md` (identity, sessions, "people who know each other" threat model)

### LLD
- `docs/llds/auth-and-accounts.md` — single-LLD source for both auth-specs and home-specs

### EARS
- `docs/specs/auth-specs.md` (46 specs)
- `docs/specs/home-specs.md` (51 specs)

### Tests
- `tests/integration/auth.test.ts`
- `tests/integration/join-flow.test.ts`
- `tests/e2e/login.spec.ts`
- `tests/e2e/logout.spec.ts`
- `tests/e2e/join-club.spec.ts`
- `tests/e2e/landing-page.spec.ts`
- `tests/unit/auth/session.test.ts` — AUTH-BE-001, AUTH-BE-002
- `tests/unit/join-flow.test.ts` — AUTH-UI-001..004 (also touches CLUB-UI-001; cross-segment)
- `tests/unit/validation/email.test.ts` — AUTH-DATA-001, AUTH-DATA-002

### Code
- `src/server/routers/auth.ts` — `auth.enter`, `auth.signIn`, `auth.me`, logout
- `src/lib/auth/` — session/identity utilities
- `src/lib/validation/email.ts` — AUTH-DATA-001, AUTH-DATA-002
- `src/app/page.tsx` — landing page
- `src/app/login/page.tsx` — login (returning users)
- `src/app/join/page.tsx` — join flow (new users + smart-detection redirect)
- `src/app/layout.tsx` — root layout, skip-nav

## Architecture

**Purpose:** Frictionless identity for "people who know each other" — email is the cross-device anchor; no passwords, no OAuth, no verification step. A long-lived session is created on first contact.

**Key Components:**
1. `auth` router — session creation, identity lookup, smart-detection of existing memberships
2. Join flow — multi-step state machine (Identity → Path → Join/Create → Success)
3. Login route — single-input email re-authentication for returning users
4. Landing page — marketing-style entry with two distinct CTAs (Log in / Sign up)

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| auth-specs.md | 46 | 37 | 3 | 3 | 3 |
| home-specs.md | 51 | 45 | 1 | 3 | 2 |
| **Total** | **97** | **82** | **4** | **6** | **5** |

**Summary:** 82 of 91 non-deferred specs marked implemented (90%). 5 divergence markers — re-spec or code-fix owed for each.

**Spec families:** AUTH-API, AUTH-API-SIGNIN, AUTH-API-LOGOUT, AUTH-BE, AUTH-BE-SESSION, AUTH-DATA, AUTH-UI, AUTH-UI-LOGIN, AUTH-UI-LOGOUT, AUTH-UI-PATH-OVERRIDE, AUTH-UI-STEP1-*, AUTH-UI-STEP2-*, AUTH-UI-STEP3A-*, AUTH-UI-STEP3B-*, AUTH-UI-STEP4-*, LANDING-UI, HOME-UI, HOME-UI-CTA-PRIMARY, HOME-UI-CTA-SECONDARY, HOME-A11Y, JOIN-UI, JOIN-UI-CREATE-*, JOIN-UI-COPY.

## Key Findings

1. **5 divergence markers** — top-priority audit targets (built-but-differs-from-spec).
2. **20+ AUTH-UI-STEP* sub-IDs are uncited via @spec** (button-/field-level granularity). Likely covered by `// @spec AUTH-UI-001..004` on `tests/unit/join-flow.test.ts:13`. Worth deciding: keep granular EARS as documentation but drop coverage expectation, or add per-element annotations.
3. **Spec-file phantom test path** — `auth-specs.md` cites `tests/integration/auth.test.ts` ✓ and `tests/integration/join-flow.test.ts` ✓; `home-specs.md` cites `tests/e2e/login-smart-detection.spec.ts` which **does not exist**. Smart-detection coverage is likely subsumed by `tests/e2e/login.spec.ts` and `tests/e2e/join-club.spec.ts`.

## Work Required

### Must Fix
1. Resolve 5 `[!]` divergence specs across `auth-specs.md` and `home-specs.md`.
2. Update `home-specs.md` `**Implementing artifacts**` header to remove the phantom `tests/e2e/login-smart-detection.spec.ts` and cite the real coverage paths.

### Should Fix
3. Address 4 `[ ]` active gaps.
4. Triage AUTH-UI-STEP* coverage: either annotate per-element or accept that parent annotations cover them.

### Nice to Have
5. Promote PARTIAL → OK once divergences and gaps are closed.
