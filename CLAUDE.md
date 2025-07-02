# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run build` - Build TypeScript CLI to dist/
- `npm run dev` - Watch mode for development
- `npm run clean` - Remove build artifacts
- `npm test` - Run tests (currently placeholder)

### Template Development
Generated projects use Make-based workflows:
- `make init` - Initial project setup
- `make run-all-scenarios` - Run complete test suite
- `make start/stop` - Spanner emulator management
- `make help` - Full command reference

## Architecture Overview

Spanwright is a **project generator** that creates Cloud Spanner E2E testing frameworks. It combines multiple technologies:

### Two-Part Architecture
1. **Generator** (`src/index.ts`): Interactive CLI that creates projects
2. **Template** (`template/`): Complete project scaffold with Go tools, Playwright tests, and Make workflows

### Technology Stack
- **TypeScript**: CLI generator and Playwright test framework
- **Go**: High-performance database tools (validation, seeding, connection pooling)
- **Make**: Workflow automation and Docker orchestration
- **Playwright**: Browser automation with database isolation

### Key Components

#### CLI Generator (`src/`)
- Interactive project creation with database configuration
- Template file copying and customization
- Dynamic `.env` file generation based on DB count (1 or 2)

#### Go Database Tools (`template/cmd/`)
- `db-validator/`: Batch validation with performance metrics
- `seed-injector/`: Data seeding with type conversion
- Uses pooled connections and structured error handling

#### Internal Go Packages (`template/internal/`)
- `config/`: Environment validation and database configuration
- `db/`: Spanner client interfaces and pooled connection management
- `data/`: Validation logic, batch processing, and performance tracking
- `retry/`: Resilient operation patterns

#### Testing Framework
- **Scenario-based**: Each test scenario has seed data, expected results, and E2E tests
- **Database Isolation**: Parallel test execution with worker-specific databases
- **Hybrid Validation**: Go tools for data validation + Playwright for browser testing

## Project Structure

### Generator Files
- `src/index.ts` - Main CLI entry point
- `package.json` - NPM package configuration
- `template/` - Complete project template

### Template Structure (Generated Projects)
```
template/
├── Makefile                    # Workflow automation
├── cmd/                        # Go CLI tools
│   ├── db-validator/          # Database validation
│   └── seed-injector/         # Data seeding
├── internal/                   # Go internal packages
│   ├── config/               # Configuration management
│   ├── db/                   # Database interfaces
│   └── data/                 # Validation logic
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── seed-data/         # JSON seed files
│       ├── expected-*.yaml    # Expected validation results
│       └── tests/             # Playwright E2E tests
├── tests/                      # Test infrastructure
│   ├── global-setup.ts        # Database isolation setup
│   └── database-isolation.ts  # Worker-specific DB management
└── playwright.config.ts       # Playwright configuration
```

## Database Architecture

### Flexible Configuration
- Supports 1 or 2 Spanner databases per project
- Environment-driven configuration via `.env`
- Schema path validation and migration support

### Connection Management
Go tools use pooled connections for performance:
- `db.NewPooledSpannerManager()` for optimized connection reuse
- Batch operations to reduce N+1 query problems
- Connection pool statistics and monitoring

### Validation System
- **Batch Validation**: `data.BatchValidator` for optimal performance
- **YAML Configuration**: Expected results defined in `expected-*.yaml`
- **Performance Metrics**: Built-in timing and connection tracking

## Testing Strategy

### Scenario-Based Testing
Each scenario contains:
1. **Seed Data** (`seed-data/*.json`): Initial database state
2. **Expected Results** (`expected-*.yaml`): Validation configuration
3. **E2E Tests** (`tests/*.spec.ts`): Browser automation

### Database Isolation
- Worker-specific database names (`primary-db-worker-1`, etc.)
- Parallel test execution without conflicts
- Global setup/teardown with cleanup

### Validation Flow
1. Start Spanner emulator (Docker)
2. Apply schema migrations (wrench)
3. Inject seed data (Go tool)
4. Run browser tests (Playwright)
5. Validate database state (Go tool)

## Development Notes

### Code Conventions
- **Go**: Standard Go project layout with internal packages
- **TypeScript**: Strict mode enabled, CommonJS modules
- **Make**: POSIX-compatible with environment variable integration

### Security Considerations
- Path traversal validation in config file handling
- Database ID format validation
- File size limits for configuration files
- No secrets in generated templates

### Performance Optimizations
- Pooled Spanner connections in Go tools
- Batch database operations
- Parallel test execution with isolation
- Connection reuse across operations

### Environment Requirements
- **wrench**: Spanner schema migration tool
- **Docker**: Spanner emulator hosting
- **Node.js**: >=22.0.0 for CLI, >=16.0.0 for generated projects
- **Go**: For database tools in generated projects