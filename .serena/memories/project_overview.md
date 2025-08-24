# Spanwright Project Overview

## Purpose
Spanwright is a CLI tool that generates Cloud Spanner E2E testing framework projects with Go database tools and Playwright browser automation.

## Core Architecture
Spanwright consists of two main components:

### Generator (TypeScript CLI)
- Interactive project creation tool
- Supports both interactive and non-interactive modes
- Environment variable configuration support
- Secure file operations with path validation
- Template processing and customization

### Template (Complete Project Scaffold)
- Go database tools + Playwright tests + Make workflows
- Complete project structure with scenarios, tests, and automation
- Multi-database support (1 or 2 Spanner databases)
- Docker Spanner emulator integration

## Generated Project Architecture
```
your-project/
├── cmd/seed-injector/          # Go CLI for database seeding
├── internal/spanwright/        # Go internal packages (config, db, retry)
├── scenarios/                  # Test scenarios with fixtures
├── tests/                      # Test infrastructure
└── Makefile                   # Workflow automation
```

## Key Features
- **Scenario-based Testing**: Structured tests with seed data and browser automation
- **Zero Config Setup**: Docker Spanner emulator management included
- **Go + Playwright**: Database tools with browser testing integration
- **Multi-database Support**: Handle 1 or 2 Spanner databases per project

## Technology Stack
- **TypeScript**: CLI generator and Playwright test framework
- **Go**: High-performance database tools (validation, seeding, connection pooling)
- **Make**: Workflow automation and Docker orchestration
- **Playwright**: Browser automation with shared database configuration
- **Docker**: Spanner emulator hosting
- **External Dependencies**: wrench (schema migrations), spalidate (database validation)

## Configuration Options
- **Interactive Mode (Default)**: Guided setup with prompts
- **Non-Interactive Mode**: Environment variable configuration
- **CI/CD Integration**: Full automation support

## Environment Variables
- `SPANWRIGHT_DB_COUNT`: Number of databases (1 or 2)
- `SPANWRIGHT_PRIMARY_DB_NAME`: Primary database name
- `SPANWRIGHT_PRIMARY_SCHEMA_PATH`: Path to primary schema
- `SPANWRIGHT_SECONDARY_DB_NAME`: Secondary database name (for 2-DB setup)
- `SPANWRIGHT_SECONDARY_SCHEMA_PATH`: Path to secondary schema (for 2-DB setup)
- `SPANWRIGHT_NON_INTERACTIVE`: Skip interactive prompts

## Test Scenarios
Generated projects include three example scenarios that serve as templates:
- `example-01-basic-setup`: Basic database operations
- `scenario-02-intermediate`: Multi-table relationships
- `scenario-03-advanced`: Complex business logic and cross-database operations

Each scenario includes YAML fixtures, expected state files, and Playwright tests with inline SQL validation.

## Performance & Security
- **Performance**: Pooled Spanner connections, batch operations, parallel test execution
- **Security**: Path traversal protection, input validation, secure temporary file handling