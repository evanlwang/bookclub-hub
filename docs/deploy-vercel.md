# Vercel Production Deployment Plan

## Context

BookClub Hub is a Next.js 16 + Prisma + PostgreSQL app. This plan sets up production deployment on Vercel with Neon Postgres.

---

## Code Changes

### 1. Add `postinstall` to `package.json`

Prisma Client must be generated during `npm install` on Vercel:

```json
"postinstall": "prisma generate"
```

### 2. Update build script in `package.json`

Run `prisma db push` before `next build` so schema stays in sync on each deploy:

```json
"build": "prisma db push && next build"
```

### 3. Create `vercel.json`

Function timeout config (default 10s on Hobby is too tight for cold Prisma connections):

```json
{
  "functions": {
    "src/app/api/**": { "maxDuration": 30 }
  }
}
```

### 4. Add Makefile targets

```makefile
deploy: ## Deploy to Vercel production
	npx vercel --prod

vercel-env: ## Pull Vercel env vars to .env.local
	npx vercel env pull .env.local
```

### 5. Update `.env.example`

Document Neon-style connection strings:

```
DATABASE_URL="postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require"  # pooled
DIRECT_URL="postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require"    # direct
RESEND_API_KEY="re_..."
OPEN_LIBRARY_BASE_URL="https://openlibrary.org"
```

---

## Manual Steps (requires credentials)

1. `npx vercel login` — authenticate
2. `npx vercel link` — link repo to Vercel project
3. Create Neon database at neon.tech, grab pooled + direct connection strings
4. Set env vars in Vercel dashboard (or `vercel env add`):
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (direct)
   - `RESEND_API_KEY`
   - `OPEN_LIBRARY_BASE_URL`
5. `make deploy` — first production deploy

---

## Verification

- `npm run build` passes locally (confirms `prisma db push` + `next build`)
- `npx vercel --prod` completes without errors
- Production URL returns the app and connects to the database
