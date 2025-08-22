# Spanwright E2E Testing Framework
-include .env
export

# Default values
PROJECT_ID ?= test-project
INSTANCE_ID ?= test-instance
PRIMARY_DB_ID ?= primary-db
SECONDARY_DB_ID ?= secondary-db
DB_COUNT ?= 2
SCENARIO ?= example-01-basic-setup
PRIMARY_SCHEMA_PATH ?= ./schema
SECONDARY_SCHEMA_PATH ?= ./schema2

# Docker settings
DOCKER_IMAGE ?= gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME ?= spanner-emulator
DOCKER_SPANNER_PORT ?= 9010

.PHONY: help init start stop setup test test-scenario

help: ## Show available commands
	@echo "Spanwright E2E Testing Framework"
	@echo "================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-10s\\033[0m %s\\n", $$1, $$2}'

init: ## Initialize project and install dependencies
	@echo "🚀 Initializing Spanwright project..."
	@echo "🔍 Checking required tools..."
	@command -v wrench >/dev/null 2>&1 || { echo "❌ wrench not found - install from https://github.com/cloudspannerecosystem/wrench"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker not found"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ node not found"; exit 1; }
	@command -v spalidate >/dev/null 2>&1 || { echo "❌ spalidate not found - install from https://github.com/nu0ma/spalidate"; exit 1; }
	@echo "✅ All tools available"
	@echo "🎭 Setting up Playwright..."
	@pnpm install
	@npx playwright install
	@echo "✅ Project initialized successfully"

start: ## Start Spanner emulator and validate tools
	@echo "🔍 Checking required tools..."
	@command -v wrench >/dev/null 2>&1 || { echo "❌ wrench not found"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker not found"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ node not found"; exit 1; }
	@command -v spalidate >/dev/null 2>&1 || { echo "❌ spalidate not found"; exit 1; }
	@echo "✅ All tools available"
	@echo "🐳 Starting Spanner emulator..."
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
		echo "📦 Existing container found, restarting..."; \
		docker stop $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
		docker rm $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
	fi
	@docker run -d --name $(DOCKER_CONTAINER_NAME) -p $(DOCKER_SPANNER_PORT):9010 $(DOCKER_IMAGE) >/dev/null
	@echo "⏳ Waiting for emulator..."
	@max_attempts=30; attempt=0; \
	while [ $$attempt -lt $$max_attempts ]; do \
		if nc -z localhost $(DOCKER_SPANNER_PORT) 2>/dev/null; then \
			echo "✅ Spanner emulator ready on localhost:$(DOCKER_SPANNER_PORT)"; \
			sleep 2; exit 0; \
		fi; \
		attempt=$$((attempt + 1)); sleep 1; \
	done; \
	echo "❌ Timeout waiting for Spanner emulator"; exit 1

stop: ## Stop Spanner emulator
	@echo "🛑 Stopping Spanner emulator..."
	@docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(DOCKER_CONTAINER_NAME) 2>/dev/null || true

setup: ## Setup databases and schemas for current scenario
	@echo "🏗️ Setting up databases for $(SCENARIO)..."
	@$(MAKE) start >/dev/null 2>&1
	@echo "📡 Creating Spanner instance..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench instance create 2>/dev/null || true
	@echo "🔶 Setting up primary database..."
	@mkdir -p ./tmp && echo "-- Empty schema" > ./tmp/schema.sql
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --directory="$$(pwd)/tmp" --schema_file=schema.sql 2>/dev/null || true
	@for file in "$(PRIMARY_SCHEMA_PATH)"/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "📄 Applying: $$file"; \
			SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench apply --ddl="$$file" || exit 1; \
		fi; \
	done
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "scenarios/$(SCENARIO)/fixtures/$(PRIMARY_DB_ID)" || exit 1
ifeq ($(DB_COUNT),2)
	@echo "☁️ Setting up secondary database..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --directory="$$(pwd)/tmp" --schema_file=schema.sql 2>/dev/null || true
	@for file in "$(SECONDARY_SCHEMA_PATH)"/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "📄 Applying: $$file"; \
			SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench apply --ddl="$$file" || exit 1; \
		fi; \
	done
	@echo "🌱 Seeding secondary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(SECONDARY_DB_ID) --fixture-dir "scenarios/$(SCENARIO)/fixtures/$(SECONDARY_DB_ID)" || exit 1
endif
	@echo "✅ Database setup complete for $(SCENARIO)"

test: ## Run complete E2E test workflow
	@echo "🚀 Running complete E2E test workflow..."
	@scenarios=$$(ls scenarios/ | grep -E '^(scenario|example)-'); \
	if [ -z "$$scenarios" ]; then \
		echo "❌ No scenarios found"; exit 1; \
	fi; \
	echo "📝 Found scenarios: $$scenarios"; \
	passed=0; failed=0; total=0; \
	for scenario in $$scenarios; do \
		total=$$((total + 1)); \
		echo ""; \
		if $(MAKE) test-scenario SCENARIO=$$scenario; then \
			echo "✅ $$scenario: PASSED"; \
			passed=$$((passed + 1)); \
		else \
			echo "❌ $$scenario: FAILED"; \
			failed=$$((failed + 1)); \
		fi; \
	done; \
	echo ""; \
	echo "═══════════════════════════════════════════════════════════"; \
	echo "📊 TEST RESULTS SUMMARY"; \
	echo "═══════════════════════════════════════════════════════════"; \
	echo "Total:  $$total scenarios"; \
	echo "Passed: $$passed scenarios"; \
	echo "Failed: $$failed scenarios"; \
	echo ""; \
	if [ $$failed -gt 0 ]; then \
		echo "❌ Some scenarios failed"; \
		exit 1; \
	else \
		echo "✅ All scenarios passed"; \
	fi

test-scenario: ## Run E2E test for a specific scenario (use SCENARIO=scenario-name)
	@if [ -z "$(SCENARIO)" ]; then \
		echo "❌ SCENARIO parameter is required"; \
		echo "Usage: make test-scenario SCENARIO=example-01-basic-setup"; \
		exit 1; \
	fi
	@if [ ! -d "scenarios/$(SCENARIO)" ]; then \
		echo "❌ Scenario '$(SCENARIO)' not found"; \
		echo "Available scenarios:"; \
		@ls scenarios/ | grep -E '^(scenario|example)-' || echo "  No scenarios found"; \
		exit 1; \
	fi
	@echo "🧪 Running E2E test for scenario: $(SCENARIO)"
	@echo "═══════════════════════════════════════════════════════════"
	@$(MAKE) start >/dev/null 2>&1
	@echo "🏗️ Setting up scenario..."
	@SCENARIO=$(SCENARIO) $(MAKE) setup >/dev/null 2>&1 || { echo "❌ Setup failed"; exit 1; }
	@echo "🎭 Running Playwright tests (includes database validation)..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) \
	 PROJECT_ID=$(PROJECT_ID) INSTANCE_ID=$(INSTANCE_ID) \
	 PRIMARY_DB_ID=$(PRIMARY_DB_ID) SECONDARY_DB_ID=$(SECONDARY_DB_ID) \
	 DB_COUNT=$(DB_COUNT) npx playwright test --grep $(SCENARIO) || { echo "❌ Playwright tests failed"; exit 1; }
	@echo "🧹 Cleaning up..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) \
	 SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) \
	 wrench truncate >/dev/null 2>&1 || true
	@if [ $(DB_COUNT) -eq 2 ]; then \
		SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) \
		SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) \
		wrench truncate >/dev/null 2>&1 || true; \
	fi
	@docker stop $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true
	@docker rm $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true
	@echo "✅ Scenario $(SCENARIO) completed successfully"