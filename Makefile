.PHONY: dev up dev-up dev-down seed db-create db-push db-reset test test-e2e test-unit test-integration typecheck

# Database config for local dev
DB_NAME := bookclub_hub_dev
DB_URL := postgresql://$(USER)@localhost:5432/$(DB_NAME)
export DATABASE_URL := $(DB_URL)
export DIRECT_URL := $(DB_URL)

# --- Local Dev ---

dev: dev-up ## Start dev server (seeds DB if needed)
	npx next dev --port 3000

up: dev-down db-create db-push seed ## One command: kill old server, reset DB, load fresh test data, and start
	npx next dev --port 3000

dev-up: db-create db-push seed ## Provision DB and seed data

dev-down: ## Kill dev server and clean up
	@-kill $$(lsof -ti :3000) 2>/dev/null; sleep 1
	@-kill -9 $$(lsof -ti :3000) 2>/dev/null; sleep 1
	@echo "Dev server stopped"

db-create: ## Create the dev database (idempotent)
	@createdb $(DB_NAME) 2>/dev/null || true

db-push: ## Push Prisma schema to dev DB
	npx prisma db push --skip-generate 2>/dev/null
	npx prisma generate

seed: ## Wipe and re-seed dev DB with fresh test data
	@echo "Loading fresh test data..."
	@npx tsx -e "\
		import devSetup from './tests/dev-setup.ts'; \
		devSetup().then(() => { \
			console.log('Seeded dev dataset successfully.'); \
			console.log(''); \
			console.log('Test accounts (any email logs in — no password):'); \
			console.log('  alice@example.com  (Alice Chen)     — owner WEDREADS · member SCIFI42 · member SLEEPYRD'); \
			console.log('  bob@example.com    (Bob Martinez)   — owner SCIFI42 · admin WEDREADS'); \
			console.log('  carol@example.com  (Carol Park)     — owner HSTBUF  · admin WEDREADS'); \
			console.log('  dave@example.com   (Dave Singh)     — owner SLEEPYRD (archived) · member WEDREADS, SCIFI42, HSTBUF'); \
			console.log('  eve@example.com    (Eve Thompson)   — member WEDREADS'); \
			console.log('  frank@example.com  (Frank Wilson)   — member WEDREADS (not started)'); \
			console.log('  grace@example.com  (Grace Lee)      — member SCIFI42'); \
			console.log('  henry@example.com  (Henry Kim)      — member HSTBUF'); \
			console.log(''); \
			console.log('Club codes: WEDREADS · SCIFI42 · HSTBUF · SLEEPYRD (archived)'); \
			console.log(''); \
			console.log('Try logging in as alice — her dashboard has BOTH attention banners'); \
			console.log('(unvoted active round + unanswered meeting availability).'); \
		}).catch(e => { console.error(e); process.exit(1); });"

db-reset: ## Drop and recreate dev DB from scratch
	@dropdb $(DB_NAME) 2>/dev/null || true
	@$(MAKE) dev-up

# --- Tests ---

test: test-unit test-integration test-e2e ## Run all tests

test-unit: ## Run unit tests
	npx vitest run

test-integration: ## Run integration tests
	npx vitest run --config vitest.config.integration.ts

test-e2e: ## Run E2E tests
	npx playwright test

typecheck: ## TypeScript check
	npx tsc --noEmit

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'
