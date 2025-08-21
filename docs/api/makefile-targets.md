# Makefile Targets

Complete reference for all Makefile targets available in Spanwright projects.

## Overview

The generated Makefile provides a comprehensive set of commands for managing your E2E testing workflow. All commands are designed to work seamlessly with the Cloud Spanner emulator and your test scenarios.

## Project Lifecycle

### `make help`
Show all available commands with descriptions.

```bash
make help
```

**Output:**
```
Spanwright E2E Testing Framework
================================

check-spalidate      Check spalidate availability
check-tools          Check required tools
clean               Clean up containers and artifacts
help                Show this help
init                Initialize project and check prerequisites
run-all-scenarios    Run all scenarios
start               Start Spanner emulator
stop                Stop Spanner emulator
```

### `make init`
Initialize the project and install all dependencies.

```bash
make init
```

**What it does:**
- Checks required tools (wrench, docker, node, spalidate)
- Installs Node.js dependencies
- Installs Playwright browsers
- Verifies all prerequisites

**Requirements:**
- All [prerequisite tools](../guide/installation) must be installed

### `make clean`
Clean up Docker containers and build artifacts.

```bash
make clean
```

**What it does:**
- Stops and removes Spanner emulator container
- Removes test result files (`test-results/`, `playwright-report/`)
- Cleans up temporary build files

## Docker & Emulator Management

### `make start`
Start the Cloud Spanner emulator in Docker.

```bash
make start
```

**Configuration:**
- **Container Name**: `spanner-emulator` (customizable via `DOCKER_CONTAINER_NAME`)
- **Port**: `9010` (customizable via `DOCKER_SPANNER_PORT`)
- **Image**: `gcr.io/cloud-spanner-emulator/emulator` (customizable via `DOCKER_IMAGE`)

**What it does:**
- Removes existing container if present
- Starts new emulator container
- Waits 15 seconds for initialization
- Verifies container is running

### `make stop`
Stop the Spanner emulator container.

```bash
make stop
```

**What it does:**
- Gracefully stops the emulator container
- Removes the container completely

## Database Setup

### `make setup`
Complete database setup including schemas and seed data.

```bash
make setup
```

**What it does:**
- Starts emulator if not running
- Creates Spanner instance and databases
- Applies schema migrations
- Injects seed data for default scenario

**Environment Variables:**
- `PRIMARY_SCHEMA_PATH`: Path to primary database schemas
- `SECONDARY_SCHEMA_PATH`: Path to secondary database schemas (if `DB_COUNT=1`)

### `make setup-primary`
Setup only the primary database.

```bash
make setup-primary
```

**Process:**
1. Creates Spanner instance (`test-instance`)
2. Creates empty database (`primary-db`)
3. Applies all `.sql` files from `PRIMARY_SCHEMA_PATH`
4. Runs Go module setup
5. Injects seed data from current scenario

### `make setup-secondary`
Setup only the secondary database (when `DB_COUNT=2`).

```bash
make setup-secondary
```

**Process:**
- Same as `setup-primary` but for secondary database
- Only runs when `DB_COUNT=2` in environment

## Testing

### `make run-all-scenarios`
Run the complete test suite for all scenarios.

```bash
make run-all-scenarios
```

**Full Workflow:**
1. **Setup**: Database schema and seed data
2. **Discovery**: Find all scenario directories
3. **Execution**: For each scenario:
   - Run Playwright E2E tests
   - Validate database state with spalidate
4. **Reporting**: Success/failure status

**Scenario Discovery:**
- Scans `scenarios/` directory
- Matches directories starting with `scenario-` or `example-`

### `make test-scenario`
Run a specific scenario.

```bash
make test-scenario SCENARIO=example-01-basic-setup
```

**Parameters:**
- `SCENARIO`: Required - name of scenario directory

**Environment Setup:**
```bash
SPANNER_EMULATOR_HOST=localhost:9010
PROJECT_ID=test-project
INSTANCE_ID=test-instance
PRIMARY_DB_ID=primary-db
SECONDARY_DB_ID=secondary-db
DB_COUNT=1
```

### `make test-e2e`
Run Playwright tests only (no database validation).

```bash
make test-e2e
```

**Usage:**
- Quick test execution without database setup
- Assumes emulator and databases are already configured

### `make test-report`
Open Playwright test report in browser.

```bash
make test-report
```

## Database Validation

### `make validate-scenario`
Validate database state for a specific scenario.

```bash
make validate-scenario SCENARIO=example-01-basic-setup
```

**Process:**
- Checks emulator is running
- Validates primary database against `expected-primary.yaml`
- Validates secondary database against `expected-secondary.yaml` (if applicable)

**Files Required:**
- `scenarios/{SCENARIO}/expected-primary.yaml`
- `scenarios/{SCENARIO}/expected-secondary.yaml` (when `DB_COUNT=2`)

### `make validate-db`
Alias for `validate-scenario` using current environment.

```bash
make validate-db
```

## Development Utilities

### `make check-tools`
Verify all required tools are installed.

```bash
make check-tools
```

**Validates:**
- `wrench` - Schema migration tool
- `docker` - Container runtime
- `node` - JavaScript runtime
- `spalidate` - Database validation tool

### `make check-spalidate`
Specifically check spalidate installation.

```bash
make check-spalidate
```

**Error Message:**
```
❌ spalidate not found - install from https://github.com/nu0ma/spalidate
```

### `make validate`
Validate project configuration and file structure.

```bash
make validate
```

**Checks:**
- `.env` file exists
- `PRIMARY_SCHEMA_PATH` is set and directory exists
- `SECONDARY_SCHEMA_PATH` validation (when `DB_COUNT=2`)

### `make build`
Build Go tools manually.

```bash
make build
```

**What it does:**
- Runs `go mod tidy`
- Builds `cmd/seed-injector/main.go` to `bin/seed-injector`

### `make new-scenario`
Create a new test scenario directory structure.

```bash
make new-scenario SCENARIO=my-new-test
```

**Creates:**
```
scenarios/my-new-test/
├── fixtures/
├── tests/
├── expected-primary.yaml
└── expected-secondary.yaml  # if DB_COUNT=1
```

### `make dev`
Development mode setup.

```bash
make dev
```

**What it does:**
- Runs complete setup
- Provides development-ready environment
- Suggests running `make test-e2e` for testing

## Environment Variables

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_ID` | `test-project` | Spanner project ID |
| `INSTANCE_ID` | `test-instance` | Spanner instance ID |
| `PRIMARY_DB_ID` | `primary-db` | Primary database ID |
| `SECONDARY_DB_ID` | `secondary-db` | Secondary database ID |
| `DB_COUNT` | `2` | Number of databases (1 or 2) |
| `SCENARIO` | `example-01-basic-setup` | Default scenario name |

### Docker Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCKER_IMAGE` | `gcr.io/cloud-spanner-emulator/emulator` | Emulator image |
| `DOCKER_CONTAINER_NAME` | `spanner-emulator` | Container name |
| `DOCKER_SPANNER_PORT` | `9010` | Host port mapping |

### Schema Paths

| Variable | Description |
|----------|-------------|
| `PRIMARY_SCHEMA_PATH` | Path to primary database schema files |
| `SECONDARY_SCHEMA_PATH` | Path to secondary database schema files |

## Common Workflows

### Full Development Cycle
```bash
make init          # Setup project
make start         # Start emulator
make setup         # Apply schemas and seed data
make run-all-scenarios  # Run all tests
make clean         # Cleanup
```

### Quick Testing
```bash
make start
make test-e2e      # Just run Playwright tests
```

### Schema Development
```bash
# Add new schema file to PRIMARY_SCHEMA_PATH/
make setup-primary  # Apply new schemas
make test-scenario SCENARIO=my-test
```

### Debugging Failed Tests
```bash
make test-scenario SCENARIO=failing-test
make validate-scenario SCENARIO=failing-test
make test-report   # Open detailed report
```

## Error Handling

### Common Error Messages

**❌ Emulator not running**
```bash
make start  # Start the emulator
```

**❌ Schema file not found**
- Check `PRIMARY_SCHEMA_PATH` environment variable
- Verify `.sql` files exist in schema directory

**❌ spalidate not found**
- Install from [github.com/nu0ma/spalidate](https://github.com/nu0ma/spalidate)

**❌ Database validation failed**
- Check `expected-*.yaml` files match actual database state
- Review test data and expected outcomes

## Customization

### Override Default Values

Create or modify `.env` file:
```bash
# .env
PROJECT_ID=my-custom-project
INSTANCE_ID=my-instance
PRIMARY_DB_ID=main-database
DOCKER_SPANNER_PORT=9020
```

### Custom Docker Image
```bash
make start DOCKER_IMAGE=my-custom-spanner-emulator:latest
```

### Custom Scenario Path
```bash
make test-scenario SCENARIO=custom/nested/scenario-name
```

## Related Documentation

- **[Project Structure](../guide/project-structure)** - Understanding generated files
- **[Schema Management](../guide/schema-management)** - Database schema best practices
- **[Database Seeding](../guide/database-seeding)** - Fixture management
- **[Writing Tests](../guide/writing-tests)** - Playwright test development