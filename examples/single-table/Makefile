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

.PHONY: help init clean start stop setup run-all test-e2e test-scenario-only reset-scenario-data debug-containers force-cleanup

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
	@echo "🔍 Checking for existing containers..."
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
		echo "📦 Existing container found, stopping and removing..."; \
		docker stop $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
		docker rm -f $(DOCKER_CONTAINER_NAME) >/dev/null 2>&1 || true; \
		sleep 3; \
	fi
	@echo "🔌 Checking port availability..."
	@if lsof -i :$(DOCKER_PORT) >/dev/null 2>&1; then \
		echo "⚠️ Port $(DOCKER_PORT) is still in use, waiting..."; \
		sleep 5; \
		if lsof -i :$(DOCKER_PORT) >/dev/null 2>&1; then \
			echo "❌ Port $(DOCKER_PORT) is still occupied. Please check for other processes."; \
			exit 1; \
		fi; \
	fi
	@echo "🚀 Starting new container..."
	@docker run -d --name $(DOCKER_CONTAINER_NAME) -p $(DOCKER_PORT):9010 $(DOCKER_IMAGE) >/dev/null
	@echo "⏳ Waiting for emulator to be ready..."
	@sleep 3
	@echo "🔍 Verifying container health..."
	@for i in 1 2 3 4 5; do \
		if docker ps --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
			echo "✅ Container is running"; \
			break; \
		fi; \
		echo "⏳ Waiting for container to start (attempt $$i/5)..."; \
		sleep 3; \
		if [ $$i -eq 5 ]; then \
			echo "❌ Container failed to start properly"; \
			docker logs $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
			exit 1; \
		fi; \
	done
	@sleep 12
	@echo "✅ Spanner emulator ready on localhost:$(DOCKER_PORT)"

stop: ## Stop Spanner emulator
	@echo "🛑 Stopping Spanner emulator..."
	@if docker ps -a --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
		echo "📦 Container found, stopping..."; \
		docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
		docker rm -f $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
		echo "🔍 Verifying container removal..."; \
		sleep 2; \
		if docker ps -a --format '{{.Names}}' | grep -q "^$(DOCKER_CONTAINER_NAME)$$"; then \
			echo "⚠️ Container still exists, forcing removal..."; \
			docker rm -f $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
		fi; \
	else \
		echo "📦 No container found to stop"; \
	fi
	@echo "✅ Spanner emulator stopped"

clean: ## Clean up containers and artifacts
	@$(MAKE) stop
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf test-results/ playwright-report/

setup: ## Setup databases and schemas
	@echo "🏗️ Setting up databases..."
	@trap 'echo "🚨 Setup interrupted! Cleaning up..."; $(MAKE) stop; exit 1' INT TERM
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

test-scenario-only: ## Run specific scenario test without setup
	@echo "🧪 Running scenario: $(SCENARIO) (no setup)"
	@npx playwright test --grep $(SCENARIO)

reset-scenario-data: ## Reset scenario data for next test
	@echo "🔄 Resetting scenario data for: $(SCENARIO)"
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures"

run-all: run-all-scenarios ## Alias for run-all-scenarios

run-all-scenarios: ## Run all scenarios
	@echo "🚀 Running all scenarios..."
	@echo "🏗️ Setting up once for all scenarios..."
	@trap 'echo "🚨 Interrupted! Cleaning up..."; $(MAKE) stop; exit 1' INT TERM
	@$(MAKE) setup
	@scenarios=$$(ls scenarios/ | grep -E '^(scenario|example)-'); \
	echo "📋 Found scenarios: $$scenarios"; \
	for scenario in $$scenarios; do \
		echo "▶️ Running $$scenario"; \
		SCENARIO=$$scenario $(MAKE) reset-scenario-data || { echo "❌ Failed to reset data for $$scenario"; $(MAKE) stop; exit 1; }; \
		KEEP_EMULATOR_AFTER_TESTS=true SCENARIO=$$scenario $(MAKE) test-scenario-only || { echo "❌ Failed to run $$scenario"; $(MAKE) stop; exit 1; }; \
		echo "✅ Completed $$scenario"; \
	done
	@echo "🧹 Cleaning up after all scenarios..."
	@$(MAKE) stop
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

debug-containers: ## Debug Docker container status
	@echo "🔍 Docker Container Debug Information"
	@echo "====================================="
	@echo "📋 All containers:"
	@docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo ""
	@echo "🔍 Spanner emulator containers:"
	@docker ps -a --filter "name=spanner-emulator" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
	@echo ""
	@echo "🔌 Port usage for $(DOCKER_PORT):"
	@lsof -i :$(DOCKER_PORT) || echo "Port $(DOCKER_PORT) is free"
	@echo ""
	@echo "📝 Container logs (last 20 lines):"
	@docker logs spanner-emulator --tail 20 2>/dev/null || echo "No logs available"

force-cleanup: ## Force cleanup of all emulator containers and processes
	@echo "🧹 Force cleanup of Spanner emulator..."
	@echo "🛑 Stopping all spanner-emulator containers..."
	@docker ps -a --filter "name=spanner-emulator" --format "{{.Names}}" | xargs -r docker stop 2>/dev/null || true
	@docker ps -a --filter "name=spanner-emulator" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
	@echo "🔌 Killing processes on port $(DOCKER_PORT)..."
	@lsof -ti :$(DOCKER_PORT) | xargs -r kill -9 2>/dev/null || true
	@echo "✅ Force cleanup completed"