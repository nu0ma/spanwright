# Spanwright

CLI tool for generating Cloud Spanner E2E testing framework projects with Go database tools and Playwright browser automation.

[![npm version](https://img.shields.io/npm/v/spanwright)](https://www.npmjs.com/package/spanwright)
[![CI](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml/badge.svg)](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nu0ma/spanwright)

## Quick Start

```bash
# Create a new E2E test project
npx spanwright your-project-name

# Navigate and initialize
cd your-project-name
make init

# Run all test scenarios
make test
```

## Features

- **Scenario-based Testing** - Structured tests with seed data and browser automation
- **Zero Config Setup** - Docker Spanner emulator management included  
- **Go + Playwright** - Database tools with browser testing integration
- **Multi-database Support** - Handle 1 or 2 Spanner databases per project

## Architecture Overview

Spanwright consists of two main components:

- **Generator** (TypeScript CLI) - Interactive project creation tool
- **Template** (Complete project scaffold) - Go database tools + Playwright tests + Make workflows

### Generated Project Architecture
```
your-project/
├── cmd/seed-injector/          # Go CLI for database seeding
├── internal/spanwright/        # Go internal packages (config, db, retry)
├── scenarios/                  # Test scenarios with fixtures
│   ├── example-01-basic-setup/ # Basic single-table tests
│   ├── scenario-02-intermediate/  # Multi-table relationships
│   └── scenario-03-advanced/   # Complex business logic
├── tests/                      # Test infrastructure
└── Makefile                   # Workflow automation
```

## Tech Stack

Generated projects use:
- **[Playwright](https://playwright.dev)** - Browser automation
- **[testfixtures](https://github.com/go-testfixtures/testfixtures)** - YAML-based database seeding
- **[wrench](https://github.com/cloudspannerecosystem/wrench)** - Spanner schema migrations
- **[spalidate](https://github.com/nu0ma/spalidate)** - Database state validation
- **[Cloud Spanner Go Client](https://cloud.google.com/go/spanner)** - Official Google client

## Configuration Options

### Interactive Mode (Default)
```bash
npx spanwright my-project
# Interactive prompts guide you through setup
```

### Non-Interactive Mode
```bash
# Single database setup
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=primary-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema
npx spanwright my-project --non-interactive

# Two database setup
export SPANWRIGHT_DB_COUNT=2
export SPANWRIGHT_PRIMARY_DB_NAME=primary-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema
export SPANWRIGHT_SECONDARY_DB_NAME=secondary-db
export SPANWRIGHT_SECONDARY_SCHEMA_PATH=./schema2
npx spanwright my-project --non-interactive
```

### Environment Variables Reference
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SPANWRIGHT_DB_COUNT` | Number of databases (1 or 2) | No | Interactive prompt |
| `SPANWRIGHT_PRIMARY_DB_NAME` | Primary database name | No | Interactive prompt |
| `SPANWRIGHT_PRIMARY_SCHEMA_PATH` | Path to primary schema | No | Interactive prompt |
| `SPANWRIGHT_SECONDARY_DB_NAME` | Secondary database name | For 2-DB setup | Interactive prompt |
| `SPANWRIGHT_SECONDARY_SCHEMA_PATH` | Path to secondary schema | For 2-DB setup | Interactive prompt |
| `SPANWRIGHT_NON_INTERACTIVE` | Skip interactive prompts | No | `false` |

## Usage Examples

### Single Database E2E Testing
Perfect for microservices or simple applications:

```bash
npx spanwright e-commerce-tests
# Choose: 1 database
# Database name: main-db
# Schema path: ./sql/schema
```

### Multi-Database Testing
Ideal for complex systems with separate read/write databases:

```bash
npx spanwright multi-tenant-tests
# Choose: 2 databases
# Primary: main-db (./schema/main)
# Secondary: analytics-db (./schema/analytics)
```

### CI/CD Integration
```bash
# In your GitHub Actions workflow
- name: Generate test project
  run: |
    export SPANWRIGHT_DB_COUNT=1
    export SPANWRIGHT_PRIMARY_DB_NAME=ci-test-db
    export SPANWRIGHT_PRIMARY_SCHEMA_PATH=/tmp/schema
    export SPANWRIGHT_NON_INTERACTIVE=true
    npx spanwright ci-test-project
```

## Test Scenarios

Generated projects include three example scenarios:

### `example-01-basic-setup`
- **Purpose**: Basic database operations and simple validation
- **Use Case**: Single-table CRUD operations
- **Fixtures**: Minimal Users and Products data

### `scenario-02-intermediate`
- **Purpose**: Multi-table relationships and complex queries
- **Use Case**: Data integrity across related tables
- **Fixtures**: Users, Products with relationships

### `scenario-03-advanced`
- **Purpose**: Complex business logic and cross-database operations
- **Use Case**: Multi-database consistency and advanced patterns
- **Fixtures**: Full dataset with Analytics and UserLogs

Each scenario includes:
- **YAML fixtures** - Minimal seed data for testing
- **Expected state files** - Database validation definitions
- **Playwright tests** - Browser automation with inline SQL validation

## Prerequisites

- **Node.js** >= 22.15.1
- **Docker** - For Spanner emulator
- **Go** - For database tools
- **wrench** - [github.com/cloudspannerecosystem/wrench](https://github.com/cloudspannerecosystem/wrench)
- **spalidate** - Install from [github.com/nu0ma/spalidate](https://github.com/nu0ma/spalidate)

## Project Structure

```
your-project-name/
├── Makefile                    # Workflow automation
├── schema/                     # Database schemas (.sql files)
├── cmd/seed-injector/         # Go data seeding tool
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── fixtures/          # YAML seed data
│       ├── expected-*.yaml    # Expected database state
│       └── tests/             # Playwright E2E tests
├── tests/                      # Test infrastructure
└── playwright.config.ts       # Playwright configuration
```

## Common Commands

```bash
# Project setup
make init                       # Initialize project and install dependencies
make start                      # Start Spanner emulator
make setup                      # Setup databases and schemas

# Testing
make test                       # Run complete E2E test workflow
make test-scenario SCENARIO=name  # Run E2E test for a specific scenario

# Utilities
make stop                       # Stop Spanner emulator
make help                       # Show available commands
```

## Troubleshooting

### Common Issues

#### Docker/Emulator Problems
```bash
# Check if emulator is running
make start

# Reset emulator state
make stop && make start
```

#### Schema Migration Issues
```bash
# Verify wrench installation
wrench version

# Check schema files
ls -la schema/

# Manually apply migrations
make setup
```

#### Go Build Errors
```bash
# Check Go version (requires Go from .tool-versions)
go version

# Clean and rebuild
go mod tidy
go build ./cmd/seed-injector
```

### Environment Issues
- **Node.js version**: Requires >= 22.15.1 for CLI
- **Path issues**: Ensure schema paths exist and are accessible
- **Permission issues**: Check Docker daemon permissions

## Development

### For Contributors

#### Setup
```bash
git clone https://github.com/nu0ma/spanwright.git
cd spanwright
pnpm install
```

#### Development Workflow
```bash
# Build and test
pnpm run build
pnpm test  # Runs unit + E2E tests

# Development mode
pnpm run dev  # Watch mode with auto-rebuild

# Code quality
pnpm run lint
pnpm run format
```

#### Project Structure
- `src/` - TypeScript CLI generator
- `template/` - Complete project template
- `e2e/` - End-to-end integration tests
- `scripts/` - Build and development utilities

### For Template Development
1. Edit files in `template/` directory
2. Test changes: `pnpm run build && pnpm test`
3. Commit only after E2E tests pass


## License

MIT License - see [LICENSE](LICENSE) for details.