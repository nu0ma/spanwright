# Spanner E2E Testing Framework

Cloud Spanner database E2E testing environment

## Quick Start

```bash
# Initial setup
make init

# Run all scenarios
make test

```

## Main Commands

| Command | Description |
|---------|-------------|
| `make init` | Initial setup |
| `make test` | Run all scenarios |
| `make help` | Detailed help |

## Configuration

Configure database count and schema paths in `.env` file:

```bash
DB_COUNT=2                                    # 1 or 2
PRIMARY_DB_SCHEMA_PATH=/path/to/schema1       # Required
SECONDARY_DB_SCHEMA_PATH=/path/to/schema2     # Only for 2DB setup
```