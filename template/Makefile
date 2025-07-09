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

# Security settings
DOCKER_SECURITY_OPTS ?= --user 1000:1000 --cap-drop=ALL --cap-add=NET_BIND_SERVICE --security-opt=no-new-privileges:true
DOCKER_RESOURCE_LIMITS ?= --memory=2g --cpus=2

.PHONY: help init clean start stop setup run-all test-e2e compose-up compose-down

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
	@docker run -d --name $(DOCKER_CONTAINER_NAME) \
		$(DOCKER_SECURITY_OPTS) \
		$(DOCKER_RESOURCE_LIMITS) \
		-p 127.0.0.1:$(DOCKER_SPANNER_PORT):9010 \
		$(DOCKER_IMAGE) >/dev/null
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
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench instance create --project $(PROJECT_ID) --instance $(INSTANCE_ID) || { echo "❌ Failed to create Spanner instance"; exit 1; }
	@echo "🗄️ Creating primary database $(PRIMARY_DB_ID)..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" --schema_file "001_initial_schema.sql" 2>/dev/null || \
	SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" --schema_file "001_initial_schema.sql" || { echo "❌ Failed to create primary database"; exit 1; }
	@echo "🔧 Setting up Go modules..."
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures/primary" || { echo "❌ Failed to seed primary database"; exit 1; }
	@echo "✅ Primary database ready"

setup-secondary: ## Setup secondary database
	@echo "☁️ Setting up secondary database..."
	@echo "🗄️ Creating secondary database $(SECONDARY_DB_ID)..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" --schema_file "001_initial_schema.sql" 2>/dev/null || \
	SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" --schema_file "001_initial_schema.sql" || { echo "❌ Failed to create secondary database"; exit 1; }
	@echo "🔧 Setting up Go modules..."
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding secondary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(SECONDARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures/secondary" || { echo "❌ Failed to seed secondary database"; exit 1; }
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
	@$(MAKE) setup
	@scenarios=$$(ls scenarios/ | grep -E '^(scenario|example)-'); \
	if [ -z "$$scenarios" ]; then \
		echo "❌ No scenarios found in scenarios/ directory"; \
		exit 1; \
	fi; \
	echo "📝 Found scenarios: $$scenarios"; \
	for scenario in $$scenarios; do \
		echo "▶️ Running $$scenario"; \
		SCENARIO=$$scenario $(MAKE) test-scenario || { echo "❌ Failed running scenario $$scenario"; exit 1; }; \
		echo "🔍 Validating $$scenario database state..."; \
		SCENARIO=$$scenario $(MAKE) validate-scenario || { echo "❌ Failed validating scenario $$scenario"; exit 1; }; \
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

compose-up: ## Start Spanner emulator using Docker Compose
	@echo "🐳 Starting Spanner emulator with Docker Compose..."
	@docker-compose up -d
	@echo "⏳ Waiting for emulator to be ready..."
	@sleep 15
	@echo "✅ Spanner emulator ready on localhost:9010"

compose-down: ## Stop Spanner emulator using Docker Compose
	@echo "🛑 Stopping Spanner emulator with Docker Compose..."
	@docker-compose down