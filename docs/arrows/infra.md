# Arrow: infra

Cross-cutting infrastructure — boot-time environment validation and typed config access. Concerns with no natural home in a feature segment.

## Status

**OK** — created 2026-06-26 (git SHA `11aba35`) to give `INFRA-ENV-VALIDATION-001` a spec home (was a reverse orphan). 0 active gaps, 0 divergences, 0 reverse orphans.

## References

### HLD
- `docs/high-level-design.md` (deployment posture — Neon/Postgres + Vercel; fail-fast on misconfiguration)

### LLD
- _(none yet — small cross-cutting concern; promote to an LLD if it grows)_

### EARS
- `docs/specs/infra-specs.md` (INFRA-ENV-VALIDATION-001)

### Tests
- `tests/unit/env.test.ts` — INFRA-ENV-VALIDATION-001 (production-required keys, dev/test minimal env, build-phase skip implied, human-readable error)

### Code
- `src/env.ts` — `parseEnv` + boot-time `validateBootEnv()` side effect + live `env` getters
- `src/lib/db.ts` — de-facto early entry point whose import triggers the boot check

## Architecture

**Purpose:** Catch a misconfigured deploy at boot, not mid-request. `parseEnv` runs once at import; in production a missing `DATABASE_URL` / `DIRECT_URL` / `CRON_SECRET` throws a readable error. The Next.js production *build* phase is exempted (`NEXT_PHASE === "phase-production-build"`) because route modules are executed for page-data collection without runtime secrets present. Typed `env` accessors read `process.env` live so tests can mutate it without re-importing.

## Spec Coverage

| Source | Active specs | `[x]` | `[ ]` (gap) | `[D]` (deferred) | `[!]` (divergence) |
|---|---|---|---|---|---|
| infra-specs.md | 1 | 1 | 0 | 0 | 0 |

## Key Findings

1. **Reverse orphan resolved.** `INFRA-ENV-VALIDATION-001` was annotated in `env.ts`/`db.ts`/`env.test.ts` with no spec entry; this segment + `infra-specs.md` now own it.
2. **Build-vs-runtime split is the subtle bit.** The `phase-production-build` skip is the only reason `next build` succeeds without runtime secrets; don't remove it without restoring build-time secret injection.

## Work Required

None pending. If infra concerns accumulate (rate-limit config, feature flags), promote `infra-specs.md` to a full LLD.
