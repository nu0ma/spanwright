# Spanner E2E Testing Framework

Cloud Spanner database E2E testing environment

## Quick Start

```bash
# Initial setup
make init

# Run all scenarios
make run-all-scenarios

# Create new test
make new-scenario SCENARIO=scenario-01-my-test
```

## Main Commands

| Command | Description |
|---------|-------------|
| `make init` | Initial setup |
| `make run-all-examples` | Alias for run-all-scenarios |
| `make run-all-scenarios` | Run all scenarios |
| `make new-scenario SCENARIO=<name>` | Create new scenario |
| `make test-e2e` | Playwright E2E test |
| `make help` | Detailed help |

## Connection Information

Connection information when emulator is running:

```bash
export SPANNER_EMULATOR_HOST=localhost:9010
# Project: test-project
# Instance: test-instance
```

## Configuration

Configure database count and schema paths in `.env` file:

```bash
DB_COUNT=2                                    # 1 or 2
PRIMARY_DB_SCHEMA_PATH=/path/to/schema1       # Required
SECONDARY_DB_SCHEMA_PATH=/path/to/schema2     # Only for 2DB setup
```

## Schema Setup

### 1. Prepare Your Schema Files

Place your DDL (`.sql`) files in the directories specified in your `.env`:

```
your-schema-directory/
├── 001_initial_tables.sql
├── 002_indexes.sql
└── 003_constraints.sql
```

**Important**: 
- Use numeric prefixes (001_, 002_, etc.) to control the order of schema application
- Files are applied in alphabetical order by filename

### 2. Create Test Fixtures

Create YAML fixture files that match your database schema:

```
scenarios/your-scenario/fixtures/primary/
├── YourTable1.yml
├── YourTable2.yml
└── README.md
```

Example fixture file format:
```yaml
# YourTable1.yml
- ID: "test-id-1"
  Name: "Test Record 1"
  CreatedAt: "2024-01-01T00:00:00Z"
```

### 3. Configure Expected Database State

Update the validation files to match your schema:

```yaml
# scenarios/your-scenario/expected-primary.yaml
tables:
  YourTable1:
    count: 1
    columns:
      - name: ID
        type: STRING
      - name: Name
        type: STRING
```

## Scenario Structure

```
scenarios/example-01-basic-setup/
├── expected-primary.yaml          # Expected values for Primary DB
├── expected-secondary.yaml        # Expected values for Secondary DB (2DB setup)
├── seed-data/                     # Seed data
└── tests/                         # Playwright E2E tests
```