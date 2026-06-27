# Infrastructure Specs

**LLD**: _(none yet — cross-cutting boot/config concern; promote to an LLD if this grows)_
**Implementing artifacts**:
- Env validation: `src/env.ts` (`parseEnv`, live `env` accessors)
- Consumer: `src/lib/db.ts` (de-facto early entry point that triggers the boot check)
- Tests: `tests/unit/env.test.ts`

Status markers: `[x]` implemented · `[ ]` gap (not yet built) · `[D]` deferred · `[!]` divergence

This file owns cross-cutting infrastructure concerns that have no natural home in a feature segment — boot-time configuration validation, typed environment access, and the build-vs-runtime distinction.

---

## Environment Validation

- `[x]` **INFRA-ENV-VALIDATION-001**: At module load, `src/env.ts` SHALL validate the process environment against a Zod schema and, when `NODE_ENV === "production"`, SHALL throw immediately if any of the required keys (`DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`) is missing — so a misconfigured deploy fails fast at boot rather than later in a request path. The thrown error SHALL be human-readable, listing each missing/invalid key on its own line under an `Invalid environment:` header. Validation SHALL be skipped when `process.env.NEXT_PHASE === "phase-production-build"` (the Next.js production build executes route modules with `NODE_ENV=production` but without runtime secrets, so validating there is a false positive). Non-production environments SHALL require none of the production keys, and `OPEN_LIBRARY_BASE_URL` SHALL default to `https://openlibrary.org`. The exported `env` object SHALL expose typed keys via live getters that read `process.env` at access time (so tests mutating `process.env` mid-suite are observed without re-importing). (`src/env.ts`, `tests/unit/env.test.ts`)
