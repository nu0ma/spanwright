# Simplified Spanwright Makefile
# Load environment variables
-include .env
export

# Default values
PROJECT_ID ?= test-project
INSTANCE_ID ?= test-instance
PRIMARY_DB_ID ?= primary-db
SECONDARY_DB_ID ?= secondary-db
DB_COUNT ?= 2
SCENARIO ?= scenario-01-basic-setup

# Docker settings
DOCKER_IMAGE ?= gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME ?= spanner-emulator
DOCKER_PORT ?= 9010

.PHONY: help init clean start stop setup run-all test-e2e

help: ## Show this help
	@echo "Spanwright E2E Testing Framework"
	@echo "================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

init: ## Initialize project and check prerequisites
	@echo "🚀 Initializing Spanwright project..."
	@$(MAKE) check-tools
	@$(MAKE) setup-playwright
	@echo "✅ Project initialized successfully"

check-tools: ## Check required tools
	@echo "🔍 Checking required tools..."
	@command -v wrench >/dev/null 2>&1 || { echo "❌ wrench not found"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker not found"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ node not found"; exit 1; }
	@echo "✅ All tools available"

setup-playwright: ## Setup Playwright
	@echo "🎭 Setting up Playwright..."
	@npm install
	@npx playwright install
	@echo "✅ Playwright setup complete"

start: ## Start Spanner emulator
	@echo "🐳 Starting Spanner emulator..."
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
		echo "📦 Existing container found, restarting..."; \
		docker stop $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
		docker rm $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
	fi
	@docker run -d --name $(DOCKER_CONTAINER_NAME) -p $(DOCKER_PORT):9010 $(DOCKER_IMAGE) >/dev/null
	@echo "⏳ Waiting for emulator to be ready..."
	@sleep 15
	@echo "✅ Spanner emulator ready on localhost:$(DOCKER_PORT)"

stop: ## Stop Spanner emulator
	@echo "🛑 Stopping Spanner emulator..."
	@docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(DOCKER_CONTAINER_NAME) 2>/dev/null || true

clean: ## Clean up containers and artifacts
	@$(MAKE) stop
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf test-results/ playwright-report/

setup: ## Setup databases and schemas
	@echo "🏗️ Setting up databases..."
	@$(MAKE) start
	@$(MAKE) setup-primary
ifeq ($(DB_COUNT),2)
	@$(MAKE) setup-secondary
endif
	@echo "✅ Database setup complete"

setup-primary: ## Setup primary database
	@echo "🔶 Setting up primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_PORT) wrench instance create --project $(PROJECT_ID) --instance $(INSTANCE_ID) >/dev/null 2>&1 || true
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$$(pwd)/$(PRIMARY_DB_SCHEMA_PATH)" >/dev/null 2>&1 || \
	SPANNER_EMULATOR_HOST=localhost:$(DOCKER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$$(pwd)/$(PRIMARY_DB_SCHEMA_PATH)" >/dev/null 2>&1
	@echo "✅ Primary database ready"
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures"

setup-secondary: ## Setup secondary database
	@echo "☁️ Setting up secondary database..."
	@wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" --schema_file "001_*.sql"
	@go run cmd/seed-injector/main.go --database-id $(SECONDARY_DB_ID) --fixture-dir scenarios/$(SCENARIO)/fixtures

test-scenario: ## Run specific scenario test
	@echo "🧪 Running scenario: $(SCENARIO)"
	@$(MAKE) setup
	@npx playwright test --grep $(SCENARIO)

run-all: run-all-scenarios ## Alias for run-all-scenarios

run-all-scenarios: ## Run all scenarios
	@echo "🚀 Running all scenarios..."
	@$(MAKE) setup
	@for scenario in $$(ls scenarios/ | grep -E '^(scenario|example)-'); do \
		echo "▶️ Running $$scenario"; \
		SCENARIO=$$scenario $(MAKE) test-scenario || exit 1; \
	done
	@echo "✅ All scenarios completed"

test-e2e: ## Run Playwright E2E tests
	@npx playwright test

new-scenario: ## Create new scenario (SCENARIO=name required)
	@if [ -z "$(SCENARIO)" ]; then echo "❌ SCENARIO required"; exit 1; fi
	@echo "📝 Creating scenario: $(SCENARIO)"
	@mkdir -p scenarios/$(SCENARIO)/fixtures scenarios/$(SCENARIO)/tests
	@echo "✅ Scenario $(SCENARIO) created"

validate: ## Validate configuration and schemas
	@echo "🔍 Validating configuration..."
	@test -f ".env" || { echo "❌ .env file missing"; exit 1; }
	@test -n "$(PRIMARY_SCHEMA_PATH)" || { echo "❌ PRIMARY_SCHEMA_PATH not set"; exit 1; }
	@test -d "$(PRIMARY_SCHEMA_PATH)" || { echo "❌ Primary schema directory not found"; exit 1; }
ifeq ($(DB_COUNT),2)
	@test -n "$(SECONDARY_SCHEMA_PATH)" || { echo "❌ SECONDARY_SCHEMA_PATH not set"; exit 1; }
	@test -d "$(SECONDARY_SCHEMA_PATH)" || { echo "❌ Secondary schema directory not found"; exit 1; }
endif
	@echo "✅ Configuration valid"

build: ## Build Go tools
	@echo "🔨 Building Go tools..."
	@go mod tidy
	@go build -o bin/seed-injector cmd/seed-injector/main.go
	@echo "✅ Build complete"

dev: ## Development mode - setup and watch
	@$(MAKE) setup
	@echo "👀 Development mode - run 'make test-e2e' to test"