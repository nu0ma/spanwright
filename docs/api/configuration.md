# Configuration

Complete reference for configuring Spanwright projects and understanding all available options.

## Overview

Spanwright projects use multiple configuration mechanisms:
- **Environment Variables** (`.env` file)
- **Playwright Configuration** (`playwright.config.ts`)
- **Go Module Configuration** (`go.mod`)
- **CLI Generation Options** (during project creation)

## Environment Variables

The `.env` file is the primary configuration mechanism for database and testing settings.

### Database Configuration

#### `DB_COUNT`
Number of Spanner databases to configure.

```bash
DB_COUNT=1  # Single database setup
DB_COUNT=2  # Dual database setup
```

**Valid Values:** `1` or `2`  
**Default:** `1`

#### `PRIMARY_DB_ID`
Primary database identifier.

```bash
PRIMARY_DB_ID=primary-db
```

**Default:** `primary-db`  
**Validation:** Alphanumeric, hyphens, and underscores only

#### `SECONDARY_DB_ID`
Secondary database identifier (only when `DB_COUNT=2`).

```bash
SECONDARY_DB_ID=secondary-db
```

**Default:** `secondary-db`  
**Required:** Only when `DB_COUNT=2`

### Spanner Connection

#### `PROJECT_ID`
Google Cloud project ID for Spanner.

```bash
PROJECT_ID=test-project
```

**Default:** `test-project`  
**Usage:** Emulator testing (not real GCP project)

#### `INSTANCE_ID`
Spanner instance identifier.

```bash
INSTANCE_ID=test-instance
```

**Default:** `test-instance`

#### `SPANNER_EMULATOR_HOST`
Spanner emulator connection endpoint.

```bash
SPANNER_EMULATOR_HOST=localhost:9010
```

**Default:** `localhost:9010`  
**Note:** Automatically set by Makefile targets

### Schema Paths

#### `PRIMARY_SCHEMA_PATH`
Directory containing primary database schema files.

```bash
PRIMARY_SCHEMA_PATH=./schema
```

**Default:** `./schema`  
**Content:** `.sql` migration files

#### `SECONDARY_SCHEMA_PATH`
Directory containing secondary database schema files.

```bash
SECONDARY_SCHEMA_PATH=./secondary-schema
```

**Required:** Only when `DB_COUNT=2`

## CLI Generation Configuration

Configuration options available during project creation with `npx spanwright`.

### Interactive Mode

When you run `npx spanwright project-name`, you'll be prompted for:

```bash
? How many Spanner databases? (1 or 2)
? Primary database name: (primary-db)
? Primary database schema path: (./schema)
? Secondary database name: (secondary-db)        # Only if count=2
? Secondary database schema path: (./secondary)  # Only if count=2
```

### Non-Interactive Mode

Use environment variables to skip prompts:

```bash
# Single database setup
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=my-main-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schemas/main

npx spanwright my-project --non-interactive
```

```bash
# Dual database setup
export SPANWRIGHT_DB_COUNT=2
export SPANWRIGHT_PRIMARY_DB_NAME=user-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schemas/users
export SPANWRIGHT_SECONDARY_DB_NAME=products-db
export SPANWRIGHT_SECONDARY_SCHEMA_PATH=./schemas/products

npx spanwright my-project --non-interactive
```

### Environment Variable Reference

| Variable | Description | Valid Values |
|----------|-------------|--------------|
| `SPANWRIGHT_DB_COUNT` | Database count | `1`, `2` |
| `SPANWRIGHT_PRIMARY_DB_NAME` | Primary DB name | Alphanumeric + hyphens/underscores |
| `SPANWRIGHT_PRIMARY_SCHEMA_PATH` | Primary schema directory | Valid directory path |
| `SPANWRIGHT_SECONDARY_DB_NAME` | Secondary DB name | Alphanumeric + hyphens/underscores |
| `SPANWRIGHT_SECONDARY_SCHEMA_PATH` | Secondary schema directory | Valid directory path |

## Playwright Configuration

The `playwright.config.ts` file controls test execution behavior.

### Key Settings

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Test execution
  testDir: './scenarios',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  // Reporting
  reporter: [['html'], ['list']],
  
  // Base configuration
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  // Browser projects
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Environment-Driven Settings

#### `BASE_URL`
Target application URL for tests.

```bash
BASE_URL=http://localhost:3000  # Default
BASE_URL=https://staging.example.com  # Custom
```

#### `CI`
Continuous integration mode detection.

```bash
CI=true   # Enables retries, forbids .only tests
CI=false  # Local development mode
```

### Test Discovery

Playwright automatically discovers tests in:
```
scenarios/
└── */
    └── tests/
        └── *.spec.ts
```

## Go Module Configuration

### `go.mod`
Generated Go module configuration:

```go
module spanwright-project

go 1.23

require (
    cloud.google.com/go/spanner v1.68.0
    github.com/go-testfixtures/testfixtures/v3 v3.12.0
    github.com/lib/pq v1.10.9
)
```

### Database Connection

Go tools automatically read environment variables:

```go
// Connection settings from environment
projectID := os.Getenv("PROJECT_ID")         // test-project
instanceID := os.Getenv("INSTANCE_ID")       // test-instance
databaseID := os.Getenv("PRIMARY_DB_ID")     // primary-db
emulatorHost := os.Getenv("SPANNER_EMULATOR_HOST") // localhost:9010
```

## Advanced Configuration

### Docker Customization

Override Docker settings in Makefile or environment:

```bash
# Docker image
DOCKER_IMAGE=gcr.io/cloud-spanner-emulator/emulator:latest

# Container name
DOCKER_CONTAINER_NAME=my-spanner-emulator

# Port mapping
DOCKER_SPANNER_PORT=9020
```

### Test Isolation

Configure database isolation behavior:

```typescript
// tests/database-isolation.ts
const dbSuffix = process.env.TEST_ISOLATION === 'true' 
  ? `-${process.pid}` 
  : '';
```

### Global Test Setup

Configure emulator behavior:

```typescript
// tests/global-setup.ts
const startEmulator = process.env.START_EMULATOR !== 'false';
const emulatorTimeout = parseInt(process.env.EMULATOR_TIMEOUT || '30000');
```

## Configuration Files by Purpose

### Database Schema
```
schema/
├── 001_users.sql
├── 002_products.sql
└── 003_orders.sql
```

### Test Data
```
scenarios/example-01/
├── fixtures/
│   ├── Users.yml
│   └── Products.yml
└── expected-primary.yaml
```

### Test Configuration
```
playwright.config.ts     # Test execution
tests/global-setup.ts    # Test environment
tests/test-utils.ts      # Helper functions
```

### Build Configuration
```
go.mod                   # Go dependencies
package.json            # Node.js dependencies
Makefile                # Build automation
.env                    # Environment settings
```

## Validation Rules

### Database Names
- Alphanumeric characters only
- Hyphens and underscores allowed
- Must start with letter
- Maximum 30 characters

**Valid Examples:**
```bash
PRIMARY_DB_ID=user-database
PRIMARY_DB_ID=UserDB_v2
PRIMARY_DB_ID=analytics_2024
```

**Invalid Examples:**
```bash
PRIMARY_DB_ID=123database  # Starts with number
PRIMARY_DB_ID=user@db      # Contains @
PRIMARY_DB_ID=             # Empty
```

### Schema Paths
- Must be relative paths
- Directory must exist
- Must contain `.sql` files

**Valid Examples:**
```bash
PRIMARY_SCHEMA_PATH=./schema
PRIMARY_SCHEMA_PATH=./db/migrations
PRIMARY_SCHEMA_PATH=../shared-schemas
```

### Database Count
- Must be `1` or `2`
- Affects template generation
- Controls Makefile behavior

## Configuration Patterns

### Single Database Project
```bash
# .env
DB_COUNT=1
PRIMARY_DB_ID=main-database
PRIMARY_SCHEMA_PATH=./schema
PROJECT_ID=test-project
INSTANCE_ID=test-instance
```

### Multi-Database Project
```bash
# .env
DB_COUNT=2
PRIMARY_DB_ID=user-service-db
SECONDARY_DB_ID=product-service-db
PRIMARY_SCHEMA_PATH=./schemas/users
SECONDARY_SCHEMA_PATH=./schemas/products
PROJECT_ID=test-project
INSTANCE_ID=test-instance
```

### CI/CD Configuration
```bash
# .env.ci
CI=true
SPANNER_EMULATOR_HOST=localhost:9010
START_EMULATOR=true
STOP_EMULATOR_AFTER_TESTS=true
BASE_URL=http://localhost:8080
```

## Troubleshooting Configuration

### Common Issues

**❌ `.env` file missing**
```bash
make validate  # Checks configuration
```

**❌ Invalid database count**
```bash
# Error: SPANWRIGHT_DB_COUNT must be 1 or 2
export SPANWRIGHT_DB_COUNT=1  # Fix
```

**❌ Schema path not found**
```bash
# Error: PRIMARY_SCHEMA_PATH not set
mkdir -p ./schema  # Create directory
echo "PRIMARY_SCHEMA_PATH=./schema" >> .env  # Set path
```

**❌ Emulator connection failed**
```bash
# Check emulator status
make start
docker ps | grep spanner-emulator
```

### Validation Commands

```bash
# Validate full configuration
make validate

# Check required tools
make check-tools

# Test database connectivity
make setup-primary
```

## Related Documentation

- **[Installation](../guide/installation)** - Prerequisites and tool setup
- **[Quick Start](../guide/quick-start)** - Basic configuration walkthrough
- **[Makefile Targets](./makefile-targets)** - Command reference
- **[Schema Management](../guide/schema-management)** - Database schema organization