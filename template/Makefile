# Configurable variables
DATABASE_ID ?= test-db
SEED_FILE ?= 
SCENARIO ?= scenario-01-basic-setup

# Load environment variables (from .env file)
-include .env
export

# Database configuration (uses values from .env, can be overridden from command line)
PROJECT_ID := $(if $(PROJECT_ID),$(PROJECT_ID),test-project)
INSTANCE_ID := $(if $(INSTANCE_ID),$(INSTANCE_ID),test-instance)
PRIMARY_DB_ID := $(if $(PRIMARY_DB_ID),$(PRIMARY_DB_ID),primary-db)
SECONDARY_DB_ID := $(if $(SECONDARY_DB_ID),$(SECONDARY_DB_ID),secondary-db)
DB_COUNT := $(if $(DB_COUNT),$(DB_COUNT),2)

# Docker configuration (environment variables or default values)
DOCKER_IMAGE ?= gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME ?= spanner-emulator
DOCKER_SPANNER_PORT ?= 9010
DOCKER_ADMIN_PORT ?= 9020
DOCKER_STARTUP_WAIT ?= 20

# Runtime configuration
TIMEOUT_SECONDS ?= 120

# Note: Common configuration is managed in config/common-database-config.yaml
# Scenario-specific file paths follow standard naming conventions


# Initial setup command
.PHONY: init
init:
	@echo "🚀 Starting initial setup of E2E test framework..."
	@echo ""
	@# Check prerequisites
	@echo "🔍 Checking prerequisites..."
	@$(MAKE) check-prerequisites
	@echo ""
	@# Check .env file
	@if [ ! -f ".env" ]; then \
		echo "❌ .env file not found"; \
		echo ""; \
		echo "⚠️  Important: Please configure the .env file with the following settings:"; \
		echo "  - PRIMARY_DB_SCHEMA_PATH: Primary DB schema path"; \
		echo "  - SECONDARY_DB_SCHEMA_PATH: Secondary DB schema path (for 2-DB configuration)"; \
		echo ""; \
		echo "💡 Configuration example:"; \
		echo "  PRIMARY_DB_SCHEMA_PATH=/path/to/your/db1/migrations"; \
		echo "  SECONDARY_DB_SCHEMA_PATH=/path/to/your/db2/migrations"; \
		echo ""; \
		echo "📋 After configuration, please run the following:"; \
		echo "  make run-all-scenarios"; \
		exit 1; \
	else \
		echo "✅ .env file already exists"; \
	fi
	@echo ""
	@# Setup Playwright if not done
	@echo "🎭 Setting up Playwright environment..."
	@$(MAKE) playwright-setup
	@echo ""
	@echo "🎉 Initial setup completed!"
	@echo "Next step: Create a new scenario with 'make new-scenario SCENARIO=scenario-01-basic-setup'"

# Prerequisites check
.PHONY: check-prerequisites
check-prerequisites:
	@echo "🔍 Checking required tools..."
	@$(MAKE) check-wrench
	@$(MAKE) check-docker
	@$(MAKE) check-node
	@echo "✅ All prerequisites are satisfied"

# Docker availability check
.PHONY: check-docker
check-docker:
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "❌ Error: Docker not found"; \
		echo "💡 Please install Docker: https://docs.docker.com/get-docker/"; \
		exit 1; \
	fi
	@echo "✅ Docker is available"

# Node.js availability check
.PHONY: check-node
check-node:
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "❌ Error: Node.js/npm not found"; \
		echo "💡 Please install Node.js: https://nodejs.org/"; \
		exit 1; \
	fi
	@echo "✅ Node.js/npm is available"

# .env file check
.PHONY: check-env
check-env:
	@if [ ! -f ".env" ]; then \
		echo "❌ Error: .env file not found"; \
		echo "💡 Setup procedure:"; \
		echo "  make init  # Run initial setup"; \
		exit 1; \
	fi
	@echo "✅ .env file exists"

# Go dependencies management
.PHONY: go-deps
go-deps:
	@if [ ! -f "go.mod" ]; then \
		echo "❌ Error: go.mod not found"; \
		echo "💡 This command should be run from the project root directory"; \
		exit 1; \
	fi
	@echo "📦 Managing Go dependencies..."
	@go mod tidy
	@echo "✅ Go dependencies updated"

.PHONY: start
start: check-env
	@echo "🚀 Starting Spanner emulator..."
	@# Check if Docker is available
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "❌ Error: Docker not found"; \
		echo "Please install and start Docker"; \
		exit 1; \
	fi
	@# Stop and remove existing container if it exists
	@docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(DOCKER_CONTAINER_NAME) 2>/dev/null || true
	@# Start new container
	@echo "🐳 Starting container..."
	@if ! docker run -d --name $(DOCKER_CONTAINER_NAME) -p $(DOCKER_SPANNER_PORT):$(DOCKER_SPANNER_PORT) -p $(DOCKER_ADMIN_PORT):$(DOCKER_ADMIN_PORT) $(DOCKER_IMAGE); then \
		echo "❌ Error: Failed to start Spanner emulator"; \
		exit 1; \
	fi
	@echo "⏳ Waiting for emulator to be ready..."
	@# Wait for emulator to be ready with simple port check
	@timeout=$(DOCKER_STARTUP_WAIT); \
	while [ $$timeout -gt 0 ]; do \
		if nc -z localhost $(DOCKER_SPANNER_PORT) 2>/dev/null; then \
			echo "✅ Spanner emulator is ready (localhost:$(DOCKER_SPANNER_PORT))"; \
			echo "🔍 Checking emulator stability..."; \
			sleep 2; \
			break; \
		fi; \
		echo "⏳ Waiting... ($$timeout seconds remaining)"; \
		sleep 1; \
		timeout=$$((timeout - 1)); \
	done; \
	if [ $$timeout -eq 0 ]; then \
		echo "❌ Error: Spanner emulator startup timed out"; \
		echo "🔍 Checking emulator logs..."; \
		docker logs $(DOCKER_CONTAINER_NAME); \
		echo "💡 Troubleshooting:"; \
		echo "  - Please check if Docker Desktop is running"; \
		echo "  - Please check if port $(DOCKER_SPANNER_PORT) is not used by other processes"; \
		echo "  - Please stop the emulator with 'make stop' and try again"; \
		exit 1; \
	fi

# wrench availability check
.PHONY: check-wrench
check-wrench:
	@if ! command -v wrench >/dev/null 2>&1; then \
		echo "❌ Error: wrench not found"; \
		echo "💡 Installation instructions:"; \
		echo "  go install github.com/cloudspannerecosystem/wrench@latest"; \
		echo "  or refer to https://github.com/cloudspannerecosystem/wrench#installation"; \
		exit 1; \
	fi
	@echo "✅ wrench is available"

.PHONY: schema
schema: check-wrench
	@if [ -z "$(SCHEMA_PATH)" ]; then \
		echo "❌ Error: SCHEMA_PATH is required"; \
		echo "Usage: make schema SCHEMA_PATH=/path/to/migrations"; \
		exit 1; \
	fi
	@echo "📋 Applying schema using wrench..."
	@echo "📁 Schema path: $(SCHEMA_PATH)"
	@echo "🏗️  Creating Spanner instance..."
	@# Create instance using wrench (ignore error if already exists)
	@export SPANNER_PROJECT_ID=$(PROJECT_ID) && \
	 export SPANNER_INSTANCE_ID=$(INSTANCE_ID) && \
	 export SPANNER_EMULATOR_HOST=localhost:9010 && \
	 wrench instance create 2>/dev/null || echo "  ℹ️  Instance $(INSTANCE_ID) already exists or has been created"
	@echo "🗄️  Creating empty database..."
	@# Create empty database first (ignore error if already exists)
	@mkdir -p ./tmp && echo "" > ./tmp/empty_schema.sql
	@export SPANNER_PROJECT_ID=$(PROJECT_ID) && \
	 export SPANNER_INSTANCE_ID=$(INSTANCE_ID) && \
	 export SPANNER_DATABASE_ID=$(DATABASE_ID) && \
	 export SPANNER_EMULATOR_HOST=localhost:9010 && \
	 wrench create --directory=./tmp --schema_file=empty_schema.sql 2>/dev/null || echo "  ℹ️  Database $(DATABASE_ID) already exists or has been created"
	@echo "🔄 Applying individual migration files sequentially..."
	@# Apply each migration file individually using wrench apply
	@export SPANNER_PROJECT_ID=$(PROJECT_ID) && \
	 export SPANNER_INSTANCE_ID=$(INSTANCE_ID) && \
	 export SPANNER_DATABASE_ID=$(DATABASE_ID) && \
	 export SPANNER_EMULATOR_HOST=localhost:9010 && \
	 for migration_file in $(SCHEMA_PATH)/*.sql; do \
		echo "  📄 Applying: $$migration_file"; \
		wrench apply --ddl="$$migration_file" || { echo "❌ Migration failed: $$migration_file"; exit 1; }; \
	 done
	@echo "✅ Schema application using wrench completed"

.PHONY: seed
seed: go-deps
	@if [ -z "$(SEED_FILE)" ]; then \
		echo "❌ Error: SEED_FILE is required"; \
		echo "Usage: make seed SEED_FILE=/path/to/seed.json DATABASE_ID=my-db"; \
		exit 1; \
	fi
	@echo "🌱 Injecting seed data..."
	@echo "📁 Seed data: $(SEED_FILE)"
	@echo "🎯 Target DB: $(DATABASE_ID)"
	@SPANNER_EMULATOR_HOST=localhost:9010 SCHEMA_PATH=$(SCHEMA_PATH) go run ./cmd/seed-injector --database-id=$(DATABASE_ID) --seed-file=$(SEED_FILE)
	@echo "✅ Seed data injection completed"

.PHONY: check-data
check-data: go-deps
	@echo "🔍 Checking data..."
	@SPANNER_EMULATOR_HOST=localhost:9010 go run ./cmd/db-validator $(DATABASE_ID) --summary
	@echo "✅ Data check completed"

# Dedicated commands for Primary DB
.PHONY: setup-primary
setup-primary:
	@echo "🔶 Starting Primary DB setup..."
	@if [ ! -d "$(PRIMARY_DB_SCHEMA_PATH)" ]; then \
		echo "❌ Error: Primary DB schema path not found: $(PRIMARY_DB_SCHEMA_PATH)"; \
		echo "Please check the schema path"; \
		exit 1; \
	fi
	@$(MAKE) schema SCHEMA_PATH=$(PRIMARY_DB_SCHEMA_PATH) DATABASE_ID=$(PRIMARY_DB_ID)
	@echo "✅ Primary DB schema setup completed"

.PHONY: check-primary
check-primary:
	@echo "🔍 Checking Primary DB data..."
	@$(MAKE) check-data DATABASE_ID=$(PRIMARY_DB_ID)

# Dedicated commands for Secondary DB
.PHONY: setup-secondary
setup-secondary:
	@echo "☁️ Starting Secondary DB setup..."
	@if [ ! -d "$(SECONDARY_DB_SCHEMA_PATH)" ]; then \
		echo "❌ Error: Secondary DB schema path not found: $(SECONDARY_DB_SCHEMA_PATH)"; \
		echo "Please check the schema path"; \
		exit 1; \
	fi
	@$(MAKE) schema SCHEMA_PATH=$(SECONDARY_DB_SCHEMA_PATH) DATABASE_ID=$(SECONDARY_DB_ID)
	@echo "✅ Secondary DB schema setup completed"

.PHONY: check-secondary
check-secondary:
	@echo "🔍 Checking Secondary DB data..."
	@$(MAKE) check-data DATABASE_ID=$(SECONDARY_DB_ID)

# Setup configured DBs (schema only)
.PHONY: setup-all
setup-all: check-env
	@echo "🚀 Setting up schemas for configured DBs..."
	@$(MAKE) setup-primary
ifeq ($(DB_COUNT),2)
	@$(MAKE) setup-secondary
endif
	@echo "✅ All DB schema setup completed"

# Check data of configured DBs
.PHONY: check-all
check-all:
	@echo "🔍 Checking data of configured DBs..."
	@$(MAKE) check-primary
ifeq ($(DB_COUNT),2)
	@$(MAKE) check-secondary
endif
	@echo "✅ All DB data check completed"

.PHONY: stop
stop:
	@echo "🛑 Stopping Spanner emulator..."
	@if docker ps | grep -q $(DOCKER_CONTAINER_NAME); then \
		echo "🐳 Stopping container..."; \
		docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
	fi
	@if docker ps -a | grep -q $(DOCKER_CONTAINER_NAME); then \
		echo "🗑️ Removing container..."; \
		docker rm $(DOCKER_CONTAINER_NAME) 2>/dev/null || true; \
	fi
	@echo "✅ Spanner emulator stopped"

# Scenario-based commands

# Create new scenario
.PHONY: new-scenario
new-scenario:
	@if [ -z "$(SCENARIO)" ]; then \
		echo "❌ Error: SCENARIO is required"; \
		echo "Usage: make new-scenario SCENARIO=scenario-03-my-test"; \
		exit 1; \
	fi
	@if [ -d "scenarios/$(SCENARIO)" ]; then \
		echo "❌ Error: Scenario $(SCENARIO) already exists"; \
		exit 1; \
	fi
	@echo "📁 Creating new scenario: $(SCENARIO)"
	@mkdir -p scenarios/$(SCENARIO)/seed-data
	@mkdir -p scenarios/$(SCENARIO)/tests/fixtures
	@echo "📝 Creating configuration file..."
	@echo "name: $(SCENARIO)" > scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "description: Description for $(SCENARIO) goes here" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "version: \"1.0\"" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "# Scenario-specific file path configuration" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "scenario_files:" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "  primary-db:" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "    seed: seed-data/primary-seed.json" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "    expected: expected-primary.yaml" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "  " >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "  secondary-db:" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "    seed: seed-data/secondary-seed.json" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "    expected: expected-secondary.yaml" >> scenarios/$(SCENARIO)/scenario-config.yaml
	@echo "📝 Creating expected value file templates..."
	@cp templates/expected-primary.yaml scenarios/$(SCENARIO)/expected-primary.yaml
	@if [ "$(DB_COUNT)" = "2" ]; then \
		cp templates/expected-secondary.yaml scenarios/$(SCENARIO)/expected-secondary.yaml; \
	fi
	@echo "📝 Creating seed data file templates..."
	@cp templates/primary-seed.json scenarios/$(SCENARIO)/seed-data/primary-seed.json
	@if [ "$(DB_COUNT)" = "2" ]; then \
		cp templates/secondary-seed.json scenarios/$(SCENARIO)/seed-data/secondary-seed.json; \
	fi
	@echo "📝 Creating description file..."
	@sed 's/SCENARIO_NAME/$(SCENARIO)/g' templates/description.md > scenarios/$(SCENARIO)/description.md
	@echo "📝 Creating E2E test template..."
	@sed 's/SCENARIO_NAME/$(SCENARIO)/g' templates/test-template.spec.ts > scenarios/$(SCENARIO)/tests/$(SCENARIO).spec.ts
	@# Copy DB Validator fixtures
	@if [ -f "scenarios/example-01-basic-setup/tests/fixtures/db-validator.ts" ]; then \
		cp scenarios/example-01-basic-setup/tests/fixtures/db-validator.ts scenarios/$(SCENARIO)/tests/fixtures/; \
	fi
	@echo ""
	@echo "✅ Scenario $(SCENARIO) has been created!"
	@echo ""
	@echo "📋 Next steps:"
	@echo "  1. Edit scenarios/$(SCENARIO)/seed-data/ JSON files"
	@echo "  2. Edit scenarios/$(SCENARIO)/expected-*.yaml expected values"
	@echo "  3. Edit scenarios/$(SCENARIO)/tests/$(SCENARIO).spec.ts test cases"
	@echo ""
	@echo "🧪 Test execution:"
	@echo "  make setup-scenario SCENARIO=$(SCENARIO)     # DB setup"
	@echo "  make validate-scenario SCENARIO=$(SCENARIO)  # DB validation"
	@echo "  make test-e2e-scenario SCENARIO=$(SCENARIO)  # E2E test"

.PHONY: list-scenarios
list-scenarios:
	@echo "📋 Available scenarios:"
	@find scenarios -name "scenario-*" -type d | sort | sed 's/scenarios\//  - /'


.PHONY: validate-db
validate-db: go-deps
	@if [ -z "$(DATABASE_ID)" ]; then \
		echo "❌ Error: DATABASE_ID is required"; \
		echo "Usage: make validate-db DATABASE_ID=portal-db CONFIG=validation-config.json"; \
		exit 1; \
	fi
	@if [ -z "$(CONFIG)" ]; then \
		echo "❌ Error: CONFIG is required"; \
		echo "Usage: make validate-db DATABASE_ID=portal-db CONFIG=validation-config.json"; \
		exit 1; \
	fi
	@echo "🔍 Validating database: $(DATABASE_ID)"
	@SPANNER_EMULATOR_HOST=localhost:9010 go run ./cmd/db-validator $(DATABASE_ID) $(CONFIG)

.PHONY: setup-scenario
setup-scenario:
	@if [ -z "$(SCENARIO)" ]; then \
		echo "❌ Error: SCENARIO is required"; \
		echo "Usage: make setup-scenario SCENARIO=scenario-01-basic-setup"; \
		exit 1; \
	fi
	@if [ ! -d "scenarios/$(SCENARIO)" ]; then \
		echo "❌ Error: Scenario directory not found: scenarios/$(SCENARIO)"; \
		echo "Available scenarios:"; \
		$(MAKE) list-scenarios; \
		exit 1; \
	fi
	@echo "🔧 Setting up scenario: $(SCENARIO)"
	@# Check if emulator is already running, start only if needed
	@if ! docker ps | grep -q $(DOCKER_CONTAINER_NAME); then \
		echo "🚀 Starting Spanner emulator..."; \
		$(MAKE) start; \
		sleep 3; \
	else \
		echo "ℹ️  Spanner emulator is already running"; \
	fi
	@if [ -f "scenarios/$(SCENARIO)/seed-data/primary-seed.json" ]; then \
		echo "🔶 Setting up Primary DB for scenario..."; \
		$(MAKE) schema SCHEMA_PATH=$(PRIMARY_DB_SCHEMA_PATH) DATABASE_ID=$(PRIMARY_DB_ID); \
		$(MAKE) seed SCHEMA_PATH=$(PRIMARY_DB_SCHEMA_PATH) DATABASE_ID=$(PRIMARY_DB_ID) SEED_FILE="scenarios/$(SCENARIO)/seed-data/primary-seed.json"; \
	fi
	@if [ "$(DB_COUNT)" = "2" ] && [ -f "scenarios/$(SCENARIO)/seed-data/secondary-seed.json" ]; then \
		echo "☁️ Setting up Secondary DB for scenario..."; \
		$(MAKE) schema SCHEMA_PATH=$(SECONDARY_DB_SCHEMA_PATH) DATABASE_ID=$(SECONDARY_DB_ID); \
		$(MAKE) seed SCHEMA_PATH=$(SECONDARY_DB_SCHEMA_PATH) DATABASE_ID=$(SECONDARY_DB_ID) SEED_FILE="scenarios/$(SCENARIO)/seed-data/secondary-seed.json"; \
	fi
	@echo "✅ Scenario setup completed: $(SCENARIO)"

.PHONY: validate-scenario
validate-scenario:
	@if [ -z "$(SCENARIO)" ]; then \
		echo "❌ Error: SCENARIO is required"; \
		echo "Usage: make validate-scenario SCENARIO=scenario-01-basic-setup"; \
		exit 1; \
	fi
	@if [ ! -d "scenarios/$(SCENARIO)" ]; then \
		echo "❌ Error: Scenario directory not found: scenarios/$(SCENARIO)"; \
		exit 1; \
	fi
	@echo "🔍 Validating scenario: $(SCENARIO)"
	@if [ -f "scenarios/$(SCENARIO)/expected-primary.yaml" ]; then \
		echo "🔶 Validating Primary DB..."; \
		$(MAKE) validate-db DATABASE_ID=$(PRIMARY_DB_ID) CONFIG="scenarios/$(SCENARIO)/expected-primary.yaml"; \
	fi
	@if [ "$(DB_COUNT)" = "2" ] && [ -f "scenarios/$(SCENARIO)/expected-secondary.yaml" ]; then \
		echo "☁️ Validating Secondary DB..."; \
		$(MAKE) validate-db DATABASE_ID=$(SECONDARY_DB_ID) CONFIG="scenarios/$(SCENARIO)/expected-secondary.yaml"; \
	fi
	@echo "✅ Scenario validation completed: $(SCENARIO)"

# Run all scenarios in batch (from emulator startup to validation)
.PHONY: run-all-scenarios
run-all-scenarios:
	@echo "🚀 Starting complete E2E test suite..."
	@echo "===================================="
	@echo ""
	
	@echo "🔧 Step 1: Setting up Spanner emulator..."
	@$(MAKE) start
	@sleep 3
	@echo ""
	
	@echo "🧪 Step 2: Running all available scenarios..."
	@scenarios_found=false; \
	for scenario_dir in scenarios/scenario-*; do \
		if [ -d "$$scenario_dir" ]; then \
			scenarios_found=true; \
			scenario_name=$$(basename "$$scenario_dir"); \
			echo ""; \
			echo "🎯 Running scenario: $$scenario_name"; \
			echo "----------------------------------------"; \
			echo "📦 Setting up databases for scenario..."; \
			primary_seed_file="scenarios/$$scenario_name/seed-data/primary-seed.json"; \
			secondary_seed_file="scenarios/$$scenario_name/seed-data/secondary-seed.json"; \
			if [ -f "$$primary_seed_file" ]; then \
				echo "  🔶 Setting up Primary DB..."; \
				$(MAKE) schema SCHEMA_PATH=$(PRIMARY_DB_SCHEMA_PATH) DATABASE_ID=$(PRIMARY_DB_ID); \
				$(MAKE) seed SCHEMA_PATH=$(PRIMARY_DB_SCHEMA_PATH) DATABASE_ID=$(PRIMARY_DB_ID) SEED_FILE="$$primary_seed_file"; \
			fi; \
			if [ "$(DB_COUNT)" = "2" ] && [ -f "$$secondary_seed_file" ]; then \
				echo "  ☁️ Setting up Secondary DB..."; \
				$(MAKE) schema SCHEMA_PATH=$(SECONDARY_DB_SCHEMA_PATH) DATABASE_ID=$(SECONDARY_DB_ID); \
				$(MAKE) seed SCHEMA_PATH=$(SECONDARY_DB_SCHEMA_PATH) DATABASE_ID=$(SECONDARY_DB_ID) SEED_FILE="$$secondary_seed_file"; \
			fi; \
			echo "🔍 Validating scenario with DB checks..."; \
			if $(MAKE) validate-scenario SCENARIO=$$scenario_name; then \
				echo "✅ $$scenario_name DB validation: PASSED"; \
			else \
				echo "❌ $$scenario_name DB validation: FAILED"; \
				echo "🛑 Stopping execution due to scenario failure"; \
				exit 1; \
			fi; \
			echo "🎭 Running Playwright E2E test for scenario..."; \
			if $(MAKE) test-e2e-scenario SCENARIO=$$scenario_name; then \
				echo "✅ $$scenario_name E2E test: PASSED"; \
			else \
				echo "❌ $$scenario_name E2E test: FAILED"; \
				echo "🛑 Stopping execution due to E2E test failure"; \
				exit 1; \
			fi; \
		fi; \
	done; \
	if [ "$$scenarios_found" = false ]; then \
		echo "⚠️  No scenarios found in scenarios/ directory"; \
		echo "📋 Available scenarios:"; \
		$(MAKE) list-scenarios; \
		exit 1; \
	fi
	
	@echo ""
	@echo "🎉 All scenarios completed successfully!"
	@echo "======================================="
	@echo "✅ Emulator setup: PASSED"
	@echo "✅ All scenario DB validations: PASSED"
	@echo "✅ All scenario E2E tests: PASSED"
	@echo ""
	@echo "💡 To run individual scenarios: make validate-scenario SCENARIO=<name>"
	@echo "💡 To run individual E2E tests: make test-e2e-scenario SCENARIO=<name>"
	@$(MAKE) stop
	@echo "✅ Emulator stopped"

# Playwright E2E test related commands
.PHONY: playwright-setup
playwright-setup:
	@echo "📦 Setting up Playwright environment..."
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "❌ Error: npm not found"; \
		echo "Please install Node.js and npm"; \
		exit 1; \
	fi
	@echo "📥 Installing dependencies..."
	@npm install
	@echo "🎭 Installing Playwright browsers..."
	@npx playwright install chromium
	@echo "✅ Playwright setup complete"

.PHONY: test-e2e
test-e2e: playwright-setup
	@echo "🧪 Running E2E tests..."
	@npm test

.PHONY: test-e2e-headed
test-e2e-headed: playwright-setup
	@echo "🧪 Running E2E tests (headed mode)..."
	@npm run test:headed

.PHONY: test-e2e-debug
test-e2e-debug: playwright-setup
	@echo "🐛 Running E2E tests (debug mode)..."
	@npm run test:debug

.PHONY: test-e2e-ui
test-e2e-ui: playwright-setup
	@echo "🎨 Running E2E tests (UI mode)..."
	@npm run test:ui

.PHONY: test-report
test-report:
	@echo "📊 Opening test report..."
	@npm run report

.PHONY: test-e2e-scenario
test-e2e-scenario: playwright-setup
	@if [ -z "$(SCENARIO)" ]; then \
		echo "❌ Error: SCENARIO is required"; \
		echo "Usage: make test-e2e-scenario SCENARIO=scenario-01-basic-setup"; \
		exit 1; \
	fi
	@echo "🧪 Running E2E test for scenario: $(SCENARIO)"
	@npm test -- --grep "$(SCENARIO)"


.PHONY: help
help:
	@echo "🚀 E2E Test Framework - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "⭐ Beginner-friendly commands:"
	@echo "  make init                                     - 🚀 Initial setup (recommended)"
	@echo "  make run-all-scenarios                        - 🎯 Run all scenarios in batch (recommended)"
	@echo "  make new-scenario SCENARIO=scenario-xx-name   - 📁 Create new scenario"
	@echo ""
	@echo "Basic commands:"
	@echo "  make check-prerequisites - Check prerequisites (wrench, Docker, Node.js)"
	@echo "  make check-env      - Check .env file existence"
	@echo "  make go-deps        - Setup Go dependencies (run go mod tidy)"
	@echo "  make start          - Start Spanner emulator"
	@echo "  make setup-primary  - Setup Primary DB"
	@echo "  make setup-secondary - Setup Secondary DB"
	@echo "  make setup-all      - Setup configured DBs"
	@echo "  make check-primary  - Check Primary DB data"
	@echo "  make check-secondary - Check Secondary DB data"
	@echo "  make check-all      - Check configured DB data"
	@echo "  make schema         - Apply schema with wrench"
	@echo "  make seed           - Inject seed data"
	@echo "  make check-data     - Check data"
	@echo "  make stop           - Stop Spanner emulator"
	@echo ""
	@echo "Scenario-based commands:"
	@echo "  make run-all-scenarios                        - Run all scenarios in batch (recommended)"
	@echo "  make list-scenarios                           - List available scenarios"
	@echo "  make setup-scenario SCENARIO=<name>           - Setup scenario DB only"
	@echo "  make validate-scenario SCENARIO=<name>        - Validate scenario DB only"
	@echo "  make validate-db DATABASE_ID=<id> CONFIG=<expected.yaml> - Validate DB"
	@echo ""
	@echo "E2E test commands:"
	@echo "  make test-e2e                                           - Run E2E tests"
	@echo "  make test-e2e-ui                                        - E2E tests (UI mode)"
	@echo "  make test-e2e-debug                                     - E2E tests (debug mode)"
	@echo "  make test-e2e-headed                                    - E2E tests (browser display)"
	@echo "  make test-e2e-scenario SCENARIO=scenario-01-basic-setup - E2E test for specific scenario"
	@echo "  make test-report                                        - Display test report"
	@echo "  make playwright-setup                                   - Setup Playwright environment"
	@echo ""
	@echo "Environment variables:"
	@echo "  SCHEMA_PATH   - Schema directory path"
	@echo "  DATABASE_ID   - Database name (default: test-db)"
	@echo "  SEED_FILE     - Seed data file"
	@echo "  SCENARIO      - Scenario name"
	@echo "  CONFIG        - Expected value configuration file (expected-*.yaml)"
	@echo ""
	@echo "💡 Common usage examples:"
	@echo "  make init                                             # ⭐ Initial setup"
	@echo "  make run-all-scenarios                                # ⭐ Run all scenarios in batch (recommended)"
	@echo "  make new-scenario SCENARIO=scenario-02-my-test        # 📁 Create new scenario"
	@echo "  make setup-scenario SCENARIO=example-01-basic-setup # Setup scenario DB"
	@echo "  make validate-scenario SCENARIO=example-01-basic-setup # Validate scenario DB"
	@echo "  make test-e2e-scenario SCENARIO=example-01-basic-setup # Scenario E2E test"
	@echo "  make start                                            # Start emulator"
	@echo "  make list-scenarios                                   # List scenarios"
	@echo "  make setup-all                                        # Setup both DBs"
	@echo "  make schema SCHEMA_PATH=/path DATABASE_ID=my-db       # Apply individual schema"
	@echo "  make seed DATABASE_ID=my-db SEED_FILE=data.json       # Inject individual seed"
	@echo "  make check-data DATABASE_ID=my-db                     # Check individual data"
	@echo "  make stop                                             # Stop emulator"
	@echo ""
	@echo "🆘 Troubleshooting:"
	@echo "  - wrench error: make check-wrench Check installation with"
	@echo "  - Docker startup error: Check if Docker Desktop is running"
	@echo "  - .env error: make init Run initial setup with"
	@echo "  - Schema path error: Check path configuration in .env file"
	@echo ""
	@echo "📚 Detailed documentation: Refer to CLAUDE.md"
