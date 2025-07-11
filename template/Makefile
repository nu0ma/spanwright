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

# Schema configuration
SCHEMA_MODE ?= file
SCHEMA_FILE ?= 001_initial_schema.sql

# Docker settings
DOCKER_IMAGE ?= gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME ?= spanner-emulator
DOCKER_SPANNER_PORT ?= 9010

.PHONY: help init clean start stop setup run-all test-e2e configure-schema

help: ## Show this help
	@echo "Spanwright E2E Testing Framework"
	@echo "================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

init: ## Initialize project and check prerequisites
	@echo "🚀 Initializing Spanwright project..."
	@$(MAKE) check-tools
	@$(MAKE) setup-playwright
	@$(MAKE) configure-schema
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
	@if [ "$(SCHEMA_MODE)" = "folder" ]; then \
		echo "📁 Using folder mode - processing all .sql files in $(PRIMARY_SCHEMA_PATH)"; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" 2>/dev/null || \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" || { echo "❌ Failed to create primary database"; exit 1; }; \
	else \
		echo "📄 Using file mode - processing $(SCHEMA_FILE)"; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" --schema_file "$(SCHEMA_FILE)" 2>/dev/null || \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(PRIMARY_DB_ID) --directory "$(PRIMARY_SCHEMA_PATH)" --schema_file "$(SCHEMA_FILE)" || { echo "❌ Failed to create primary database"; exit 1; }; \
	fi
	@echo "🔧 Setting up Go modules..."
	@go mod tidy >/dev/null 2>&1
	@echo "🌱 Seeding primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go --database-id $(PRIMARY_DB_ID) --fixture-dir "$$(pwd)/scenarios/$(SCENARIO)/fixtures/primary" || { echo "❌ Failed to seed primary database"; exit 1; }
	@echo "✅ Primary database ready"

setup-secondary: ## Setup secondary database
	@echo "☁️ Setting up secondary database..."
	@echo "🗄️ Creating secondary database $(SECONDARY_DB_ID)..."
	@if [ "$(SCHEMA_MODE)" = "folder" ]; then \
		echo "📁 Using folder mode - processing all .sql files in $(SECONDARY_SCHEMA_PATH)"; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" 2>/dev/null || \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" || { echo "❌ Failed to create secondary database"; exit 1; }; \
	else \
		echo "📄 Using file mode - processing $(SCHEMA_FILE)"; \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench reset --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" --schema_file "$(SCHEMA_FILE)" 2>/dev/null || \
		SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) wrench create --project $(PROJECT_ID) --instance $(INSTANCE_ID) --database $(SECONDARY_DB_ID) --directory "$(SECONDARY_SCHEMA_PATH)" --schema_file "$(SCHEMA_FILE)" || { echo "❌ Failed to create secondary database"; exit 1; }; \
	fi
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

configure-schema: ## Configure schema mode (file or folder)
	@echo "🔧 Configuring schema mode..."
	@echo "Choose schema processing mode:"
	@echo "  [1] Single file mode (specify one schema file)"
	@echo "  [2] Folder mode (process all .sql files in directory)"
	@echo ""
	@read -p "Enter your choice [1-2]: " choice; \
	case $$choice in \
		1) \
			echo "SCHEMA_MODE=file" >> .env; \
			echo ""; \
			read -p "Enter schema file name (default: 001_initial_schema.sql): " schema_file; \
			if [ -z "$$schema_file" ]; then \
				schema_file="001_initial_schema.sql"; \
			fi; \
			echo "SCHEMA_FILE=$$schema_file" >> .env; \
			echo "✅ Schema mode set to: single file ($$schema_file)"; \
			;; \
		2) \
			echo "SCHEMA_MODE=folder" >> .env; \
			echo "SCHEMA_FILE=" >> .env; \
			echo "✅ Schema mode set to: folder mode (all .sql files)"; \
			;; \
		*) \
			echo "❌ Invalid choice. Please run 'make configure-schema' again."; \
			exit 1; \
			;; \
	esac