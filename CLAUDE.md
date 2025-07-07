# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run build` - Build TypeScript CLI to dist/
- `npm run dev` - Watch mode for development
- `npm run clean` - Remove build artifacts
- `npm test` - Show E2E testing information

### Template Development & Validation
- `npm run template:validate` - Validate all template files (Go, TypeScript, YAML/JSON)
- `npm run template:validate-go` - Validate Go template files only
- `npm run template:validate-ts` - Validate TypeScript template files only
- `npm run template:validate-config` - Validate YAML/JSON configuration files only

### Development Testing
- `npm run dev:create-testbed` - Create development testbed project with test schemas
- `npm run dev:test-e2e` - Run complete E2E test on testbed (Emulator + Playwright)
- `npm run dev:watch` - Validate templates and recreate testbed
- `npm run dev:quick-test` - Full pipeline: validate → create testbed → run E2E tests

### Version Management
- `npm run update-go-version <version>` - Update Go version across all configuration files and templates

## Template Development Workflow

### Development Flow
1. **Edit templates** in `template/` directory
2. **Validate changes** with `npm run template:validate`
3. **Create testbed** with `npm run dev:create-testbed` 
4. **Test E2E** with `npm run dev:test-e2e`
5. **Commit changes** after validation passes

⚠️ **IMPORTANT**: Any changes to the codebase (dependencies, templates, scripts) MUST be tested using the development testbed before committing. This ensures the full CLI generation and E2E workflow continues to function correctly.

### Quick Development Commands
- `npm run dev:quick-test` - Complete pipeline: validate → testbed → E2E test
- `npm run dev:watch` - Validate templates and recreate testbed

### CI/CD Integration
- Template validation runs automatically on PR/push
- E2E tests validate generated projects work correctly
- Package testing ensures CLI installation works

## Development Testbed Usage

The development testbed allows you to test template changes with a real Spanwright project without manual setup.

### Quick Start

```bash
# 1. Validate templates
npm run template:validate

# 2. Create testbed with test schemas and data
npm run dev:create-testbed

# 3. Test the generated project
cd dev-testbed/spanwright-testbed
make init                    # Initialize project
make run-all-scenarios       # Run database + E2E tests
```

### Testbed Features

- **Auto-generated schemas**: Primary and Secondary DB with realistic tables
- **Test data**: Companies, Users, and SystemConfig seed data  
- **Complete E2E pipeline**: Spanner emulator + Playwright browser tests
- **Database isolation**: Parallel test execution with worker-specific databases

### Testbed Commands

```bash
# Full pipeline (validate → create → test)
npm run dev:quick-test

# Individual steps
npm run template:validate     # Check Go/TS/YAML syntax
npm run dev:create-testbed   # Create test project
npm run dev:test-e2e         # Run complete E2E test

# Template validation only
npm run template:validate-go      # Go files only
npm run template:validate-ts      # TypeScript files only
npm run template:validate-config  # YAML/JSON files only
```

### Testing Generated Projects

```bash
cd dev-testbed/spanwright-testbed

# Database operations
make check-prerequisites     # Verify Docker, wrench, Node.js
make start                  # Start Spanner emulator
make setup-all              # Create schemas for both databases
make stop                   # Stop emulator

# Scenario testing
make list-scenarios         # Show available test scenarios
make setup-scenario SCENARIO=scenario-01-basic-setup
make validate-scenario SCENARIO=scenario-01-basic-setup

# E2E browser testing
make test-e2e               # Run Playwright tests
make test-e2e-ui           # Interactive test UI
make test-report           # Show test results
```

### Testbed Structure

```
dev-testbed/
├── spanwright-testbed/          # Generated Spanwright project
│   ├── .env                     # Auto-configured environment
│   ├── go.mod                   # Go module with correct name
│   ├── scenarios/scenario-01-*/ # Renamed test scenario
│   └── ...                      # Complete project template
└── test-schemas/                # Auto-generated schemas
    ├── primary-db/
    │   └── 001_initial_schema.sql    # Companies, Users, UserSessions
    └── secondary-db/
        └── 001_initial_schema.sql    # SystemConfig, UserAnalytics, AuditLogs
```

### Development Workflow

1. **Edit templates** in `template/` directory
2. **Validate changes**: `npm run template:validate`
3. **Test with real project**: `npm run dev:create-testbed`
4. **Verify E2E functionality**: `cd dev-testbed/spanwright-testbed && make init && make run-all-scenarios`
5. **Clean up**: Testbed is automatically recreated on next run

🔴 **MANDATORY TESTING**: Before committing ANY changes (dependencies, scripts, templates, etc.), you MUST run `npm run dev:quick-test` to verify the complete workflow still functions. This catches breaking changes early and ensures the CLI generates working projects.

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
- `seed-injector/`: SQL-based data seeding with direct DML execution
- Uses pooled connections and structured error handling

#### Internal Go Packages (`template/internal/`)
- `config/`: Environment validation and database configuration
- `db/`: Spanner client interfaces and pooled connection management
- `retry/`: Resilient operation patterns

#### Testing Framework
- **Scenario-based**: Each test scenario has minimal seed data and inline E2E tests
- **Database Isolation**: Simple process-based database naming for parallel execution
- **Inline Validation**: Direct SQL queries for database validation + Playwright for browser testing

## Project Structure

### Generator Files
- `src/index.ts` - Main CLI entry point
- `package.json` - NPM package configuration
- `template/` - Complete project template

### Template Structure (Generated Projects)
```
template/
├── Makefile                    # Workflow automation with spalidate integration
├── cmd/                        # Go CLI tools
│   └── seed-injector/         # Data seeding
├── internal/                   # Go internal packages
│   ├── config/               # Configuration management
│   ├── db/                   # Database interfaces
│   └── retry/                # Retry logic
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── seed-data/         # Minimal SQL seed files
│       └── tests/             # Playwright E2E tests with inline validation
├── tests/                      # Test infrastructure
│   ├── global-setup.ts        # Simple emulator startup
│   ├── database-isolation.ts  # Process-based DB management
│   └── utils/
│       └── sql-validator.ts   # Direct SQL validation utility
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
- **SQL-based Validation**: Direct SQL queries for database state validation
- **Inline Configuration**: Test expectations defined directly in test files
- **Simple Integration**: No external dependencies for validation logic

## Testing Strategy

### Scenario-Based Testing
Each scenario contains:
1. **Minimal Seed Data** (`seed-data/*.sql`): Essential records only
2. **Inline Tests** (`tests/*.spec.ts`): Browser automation with embedded validation
3. **Direct SQL Validation**: Simple database state checks

### Database Isolation
- Process-specific database names (`primary-db-{process.pid}`)
- Parallel test execution without conflicts
- Simplified setup without complex worker coordination

### Validation Flow
1. Start Spanner emulator (Docker)
2. Apply schema migrations (wrench)
3. Inject minimal seed data (Go tool)
4. Run browser tests (Playwright)
5. Validate database state (SQL queries)

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
- **Go**: For seed injection tool in generated projects

## Version Management

### Go Version Updates

To update the Go version across all configuration files and templates:

```bash
# Update Go version to 1.24.3
npm run update-go-version 1.24.3

# Validate and test changes
npm run template:validate
npm run dev:create-testbed
npm run dev:test-e2e
```

### Automated Version Updates

The project includes automation for Go version updates:

#### 1. **Local CLI Script**
- **Script**: `scripts/update-go-version.ts`
- **Usage**: `npm run update-go-version <version>`
- **Updates**: All Go version references in templates and CI/CD files
- **Validation**: Automatic template validation after updates

#### 2. **GitHub Actions Workflow**
- **Workflow**: `.github/workflows/update-go-version.yml`
- **Trigger**: Manual dispatch with version input
- **Process**: Updates → Validates → Tests → Creates PR
- **Output**: Automated pull request with all changes

#### 3. **Updated Files**
The automation updates Go version references in:
- `template/go.mod.template` - Go module version and toolchain
- `.github/workflows/ci.yml` - GitHub Actions Go version
- `.github/workflows/template-validation.yml` - Template validation Go version  
- `scripts/validate-template.ts` - Fallback Go version

### Version Update Workflow

1. **Run update script**:
   ```bash
   npm run update-go-version 1.24.3
   ```

2. **Validate changes**:
   ```bash
   npm run template:validate
   ```

3. **Test with testbed**:
   ```bash
   npm run dev:create-testbed
   npm run dev:test-e2e
   ```

4. **Commit changes** after validation passes

### GitHub Actions Integration

For automated updates via GitHub Actions:

1. Go to **Actions** → **Update Go Version**
2. Click **Run workflow**
3. Enter the new Go version (e.g., `1.24.3`)
4. Review the automatically created pull request
5. Merge after CI passes

This ensures all Go version references stay synchronized across the entire project.