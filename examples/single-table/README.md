# Spanner E2E Testing Framework

Cloud Spanner database E2E testing environment

## Quick Start

```bash
# Initial setup
make init

# Run samples
make run-all-examples

# Create new test
make new-scenario SCENARIO=scenario-01-my-test
```

## Main Commands

| Command | Description |
|---------|-------------|
| `make init` | Initial setup |
| `make run-all-examples` | Run samples |
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

## Scenario Structure

```
scenarios/example-01-basic-setup/
├── expected-primary.yaml          # Expected values for Primary DB
├── expected-secondary.yaml        # Expected values for Secondary DB (2DB setup)
├── seed-data/                     # Seed data
└── tests/                         # Playwright E2E tests
```