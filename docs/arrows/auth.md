# Arrow: auth

Identity, sessions, the join/login flow, and the marketing landing page.

## Status

**OK** — last audited 2026-06-26 (git SHA `11aba35`). 0 `[ ]` active gaps, 0 `[!]` divergences, 0 reverse orphans. The join wizard was re-verified this pass (resolving the prior STALE flag): it is now a controller `page.tsx` + `_stepN` step components, and Step 1 carries a required "Pilot passcode" input (`AUTH-UI-STEP1-PASSCODE-001`, gated by `AUTH-API-PASSCODE-001/002`). Landing slice current as of `b31e1b9` (editorial rebuild).

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
- `src/app/join/page.tsx` — join flow controller (state, handlers, smart-detection redirect); step UI in `src/app/join/_step1-identity.tsx` … `_step4-success.tsx` (+ `_stepper.tsx`, `_shared.tsx`)
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
| auth-specs.md | 54 | 51 | 0 | 3 | 0 |
| home-specs.md | 52 | 49 | 0 | 3 | 0 |
| **Total** | **97** | **91** | **0** | **6** | **0** |

**Summary:** 100% of non-deferred specs implemented (90/90). 6 deliberately-deferred items (smart-detection edge polish + landing copy variants).

**Spec families:** AUTH-API, AUTH-API-SIGNIN, AUTH-API-LOGOUT, AUTH-BE, AUTH-BE-SESSION, AUTH-DATA, AUTH-UI, AUTH-UI-LOGIN, AUTH-UI-LOGOUT, AUTH-UI-PATH-OVERRIDE, AUTH-UI-STEP1-*, AUTH-UI-STEP2-*, AUTH-UI-STEP3A-*, AUTH-UI-STEP3B-*, AUTH-UI-STEP4-*, LANDING-UI, HOME-UI, HOME-UI-CTA-PRIMARY, HOME-UI-CTA-SECONDARY, HOME-A11Y, JOIN-UI, JOIN-UI-CREATE-*, JOIN-UI-COPY.

## Key Findings

1. **All non-deferred specs implemented.** Cookie security hardened in cluster 17 (`AUTH-BE-001`, `AUTH-BE-002`): server-side `Set-Cookie` with HttpOnly+Secure+SameSite=Lax, sliding expiration on every authenticated request via `src/server/context.ts` semantics inlined into both lookup paths.
2. **Cadence persistence** (cluster 4) — voting cadence is now a typed `VotingCadence` enum on `Club.votingCadence`, not embedded in description.
3. **Pilot passcode gate** — every unauthenticated entry point (`auth.enter`, `auth.signIn`, the unauthenticated `clubs.join` branch) requires the shared `PILOT_PASSCODE`; constant-time compare, fails closed in production when unset (`AUTH-API-PASSCODE-001/002`, `src/lib/auth/passcode.ts`). Step 1 and `/login` surface the passcode input.
4. **Join wizard composed of step components** — the monolithic page was split into `_step1-identity.tsx` … `_step4-success.tsx`; spec `file:line` refs repointed accordingly. The Step 4 success moment is the library-card animation (`JOIN-UI-LIBRARYCARD-001`, in `mobile-specs.md`).
5. **6 deferred specs** — smart-detection edge cases and landing copy variants; deliberate, not drift.

## Work Required

Maintain coherence on future changes. No active fixes pending.
