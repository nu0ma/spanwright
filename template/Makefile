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
SCENARIO ?= example-01-basic-setup

# Docker settings
DOCKER_IMAGE ?= gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME ?= spanner-emulator
DOCKER_SPANNER_PORT ?= 9010

.PHONY: help init clean clean-databases start stop setup run-all test-e2e

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
	@$(MAKE) check-spalidate
	@echo "✅ All tools available"

check-spalidate: ## Check spalidate availability
	@command -v spalidate >/dev/null 2>&1 || { echo "❌ spalidate not found - install from https://github.com/nu0ma/spalidate"; exit 1; }
	@echo "✅ spalidate available"

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
	@docker run -d --name $(DOCKER_CONTAINER_NAME) -p $(DOCKER_SPANNER_PORT):9010 $(DOCKER_IMAGE) >/dev/null
	@echo "⏳ Waiting for emulator to be ready..."
	@sleep 15
	@echo "🔍 Verifying emulator status..."
	@if ! docker ps | grep -q $(DOCKER_CONTAINER_NAME); then echo "❌ Emulator container not running"; exit 1; fi
	@echo "✅ Spanner emulator ready on localhost:$(DOCKER_SPANNER_PORT)"

stop: ## Stop Spanner emulator
	@echo "🛑 Stopping Spanner emulator..."
	@docker stop $(DOCKER_CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(DOCKER_CONTAINER_NAME) 2>/dev/null || true

clean: ## Clean up containers and artifacts
	@$(MAKE) stop
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf test-results/ playwright-report/

clean-databases: ## Clean/reset databases for fresh scenario runs
	@echo "🧹 Cleaning databases for fresh scenario execution..."
	@echo "🗄️ Dropping and recreating primary database $(PRIMARY_DB_ID)..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench drop --force 2>/dev/null || echo "  ℹ️  Primary database $(PRIMARY_DB_ID) already clean or doesn't exist"
ifeq ($(DB_COUNT),2)
	@echo "☁️ Dropping and recreating secondary database $(SECONDARY_DB_ID)..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench drop --force 2>/dev/null || echo "  ℹ️  Secondary database $(SECONDARY_DB_ID) already clean or doesn't exist"
endif
	@echo "✅ Database cleanup completed"

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
	@echo "📡 Creating Spanner instance $(INSTANCE_ID)..."
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench instance create 2>/dev/null || echo "  ℹ️  Instance $(INSTANCE_ID) already exists or has been created"
	@echo "🗄️ Creating empty database $(PRIMARY_DB_ID)..."
	@mkdir -p ./tmp && echo "-- Empty schema for database creation" > ./tmp/schema.sql
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --directory="$$(pwd)/tmp" --schema_file=schema.sql 2>/dev/null || echo "  ℹ️  Database $(PRIMARY_DB_ID) already exists or has been created"
	@echo "🔄 Applying individual schema files from $(PRIMARY_SCHEMA_PATH)..."
	@for file in "$(PRIMARY_SCHEMA_PATH)"/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "  📄 Applying: $$file"; \
			SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(PRIMARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench apply --ddl="$$file" || { echo "❌ Failed to apply: $$file"; exit 1; }; \
		fi; \
	 done
	@echo "✅ Schema application completed for primary database"
	@echo "🔧 Setting up Go modules..."
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures/$(PRIMARY_DB_ID)" || { echo "❌ Failed to seed primary database"; exit 1; }
	@echo "✅ Primary database ready"

setup-secondary: ## Setup secondary database
	@echo "☁️ Setting up secondary database..."
	@echo "🗄️ Creating empty database $(SECONDARY_DB_ID)..."
	@mkdir -p ./tmp && echo "-- Empty schema for database creation" > ./tmp/schema.sql
	@SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --directory="$$(pwd)/tmp" --schema_file=schema.sql 2>/dev/null || echo "  ℹ️  Database $(SECONDARY_DB_ID) already exists or has been created"
	@echo "🔄 Applying individual schema files from $(SECONDARY_SCHEMA_PATH)..."
	@for file in "$(SECONDARY_SCHEMA_PATH)"/*.sql; do \
		if [ -f "$$file" ]; then \
			echo "  📄 Applying: $$file"; \
			SPANNER_PROJECT_ID=$(PROJECT_ID) SPANNER_INSTANCE_ID=$(INSTANCE_ID) SPANNER_DATABASE_ID=$(SECONDARY_DB_ID) SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench apply --ddl="$$file" || { echo "❌ Failed to apply: $$file"; exit 1; }; \
		fi; \
	 done
	@echo "✅ Schema application completed for secondary database"
	@echo "🔧 Setting up Go modules..."
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding secondary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(SECONDARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures/$(SECONDARY_DB_ID)" || { echo "❌ Failed to seed secondary database"; exit 1; }
	@echo "✅ Secondary database ready"

test-scenario: ## Run specific scenario test  
	@echo "🧪 Running scenario: $(SCENARIO)"
	@echo "🔍 Verifying emulator status before tests..."
	@if ! docker ps | grep -q $(DOCKER_CONTAINER_NAME); then echo "❌ Emulator not running"; exit 1; fi
	@echo "🎭 Starting Playwright tests..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) \
	PROJECT_ID=$(PROJECT_ID) \
	INSTANCE_ID=$(INSTANCE_ID) \
	PRIMARY_DB_ID=$(PRIMARY_DB_ID) \
	SECONDARY_DB_ID=$(SECONDARY_DB_ID) \
	DB_COUNT=$(DB_COUNT) \
	npx playwright test --grep $(SCENARIO) || { echo "❌ Playwright tests failed for $(SCENARIO)"; exit 1; }

run-all: run-all-scenarios ## Alias for run-all-scenarios

run-all-scenarios: ## Run all scenarios
	@echo "🚀 Running all scenarios..."
	@echo "📋 Environment: PROJECT_ID=$(PROJECT_ID), INSTANCE_ID=$(INSTANCE_ID), DB_COUNT=$(DB_COUNT)"
	@scenarios=$$(ls scenarios/ | grep -E '^(scenario|example)-'); \
	if [ -z "$$scenarios" ]; then \
		echo "❌ No scenarios found in scenarios/ directory"; \
		exit 1; \
	fi; \
	echo "📝 Found scenarios: $$scenarios"; \
	for scenario in $$scenarios; do \
		echo "▶️ Setting up clean environment for $$scenario"; \
		$(MAKE) setup; \
		echo "▶️ Running $$scenario"; \
		SCENARIO=$$scenario $(MAKE) test-scenario || { echo "❌ Failed running scenario $$scenario"; exit 1; }; \
		echo "🔍 Validating $$scenario database state..."; \
		SCENARIO=$$scenario $(MAKE) validate-scenario || { echo "❌ Failed validating scenario $$scenario"; exit 1; }; \
		echo "🧹 Cleaning up databases after $$scenario"; \
		$(MAKE) clean-databases; \
		echo "✅ Scenario $$scenario completed successfully"; \
	done
	@echo "✅ All scenarios completed"

test-e2e: ## Run Playwright E2E tests
	@npx playwright test

test-report: ## Open test report
	@echo "📊 Opening test report..."
	@npx playwright show-report

validate-scenario: ## Validate scenario database state
	@if [ -z "$(SCENARIO)" ]; then echo "❌ SCENARIO required"; exit 1; fi
	@echo "🔍 Validating scenario databases for $(SCENARIO)..."
	@echo "📡 Checking emulator status..."
	@if ! docker ps | grep -q $(DOCKER_CONTAINER_NAME); then echo "❌ Emulator not running for validation"; exit 1; fi
	@if [ -f "scenarios/$(SCENARIO)/expected-primary.yaml" ]; then \
		echo "🔍 Validating primary database for $(SCENARIO)..."; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) spalidate --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --verbose scenarios/$(SCENARIO)/expected-primary.yaml || { echo "❌ Primary database validation failed for $(SCENARIO)"; exit 1; }; \
	else \
		echo "⚠️ No primary validation file found for $(SCENARIO)"; \
	fi
ifeq ($(DB_COUNT),2)
	@if [ -f "scenarios/$(SCENARIO)/expected-secondary.yaml" ]; then \
		echo "🔍 Validating secondary database for $(SCENARIO)..."; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) spalidate --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --verbose scenarios/$(SCENARIO)/expected-secondary.yaml || { echo "❌ Secondary database validation failed for $(SCENARIO)"; exit 1; }; \
	else \
		echo "⚠️ No secondary validation file found for $(SCENARIO)"; \
	fi
endif
	@echo "✅ Database validation completed for $(SCENARIO)"

validate-db: ## Validate all databases for current scenario
	@$(MAKE) validate-scenario

new-scenario: ## Create new scenario (SCENARIO=name required)
	@if [ -z "$(SCENARIO)" ]; then echo "❌ SCENARIO required"; exit 1; fi
	@echo "📝 Creating scenario: $(SCENARIO)"
	@mkdir -p scenarios/$(SCENARIO)/fixtures scenarios/$(SCENARIO)/tests
	@cp expected-primary.yaml.template scenarios/$(SCENARIO)/expected-primary.yaml 2>/dev/null || echo "⚠️ No primary template found"
ifeq ($(DB_COUNT),2)
	@cp expected-secondary.yaml.template scenarios/$(SCENARIO)/expected-secondary.yaml 2>/dev/null || echo "⚠️ No secondary template found"
endif
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