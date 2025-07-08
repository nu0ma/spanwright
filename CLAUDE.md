# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run build` - Build TypeScript CLI to dist/
- `npm run dev` - Watch mode for development
- `npm run clean` - Remove build artifacts
- `npm test` - Show E2E testing information


### Version Management
- `npm run update-go-version <version>` - Update Go version across all configuration files and templates

## Development Workflow

1. **Edit templates** in `template/` directory
2. **Build and test** with `npm run build && npm test`
3. **Commit changes** after tests pass

⚠️ **IMPORTANT**: Before committing changes, run `npm test` to ensure the E2E workflow continues to function correctly.


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
│       ├── fixtures/          # Minimal YAML fixture files for testfixtures
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
- **Spalidate Integration**: Uses spalidate CLI tool for comprehensive database validation
- **YAML Configuration**: Expected database state defined in `expected-*.yaml` files
- **Automated Validation**: Integrated into `run-all-scenarios` workflow
- **Template-based**: Validation files auto-generated from templates

## Testing Strategy

### Scenario-Based Testing
Each scenario contains:
1. **Minimal Seed Data**: Essential records only via YAML fixtures (`fixtures/*.yml`)
2. **Inline Tests** (`tests/*.spec.ts`): Browser automation with embedded validation
3. **Direct SQL Validation**: Simple database state checks

### Database Isolation
- Process-specific database names (`primary-db-{process.pid}`)
- Parallel test execution without conflicts
- Simplified setup without complex worker coordination

### Validation Flow
1. Start Spanner emulator (Docker)
2. Apply schema migrations (wrench)
3. Inject minimal seed data (testfixtures with YAML files)
4. Run browser tests (Playwright)
5. Validate database state (spalidate with YAML expectations)

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
- **spalidate**: Database validation tool (https://github.com/nu0ma/spalidate)
- **Node.js**: >=22.0.0 for CLI, >=16.0.0 for generated projects
- **Go**: Version managed via `.tool-versions` and `.mise.toml` for consistency
- **mise** (optional): For local development version management

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
- `.mise.toml` - Mise tool configuration
- `.tool-versions` - Universal tool version file (used by GitHub Actions)
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

### Local Development with Version Management

The project now uses `.tool-versions` and `.mise.toml` for consistent Go version management:

#### Using mise (recommended)
```bash
# Install mise if not already installed
curl https://mise.run | sh

# Install the Go version specified in .mise.toml
mise install

# Use mise-managed Go
mise use
```

#### Using asdf
```bash
# Install Go plugin if not already installed
asdf plugin add golang

# Install the Go version specified in .tool-versions
asdf install

# Set local Go version
asdf local golang $(cat .tool-versions | grep go | cut -d' ' -f2)
```

#### Manual Installation
Check `.tool-versions` for the current Go version and install it manually.

### GitHub Actions Version Management

GitHub workflows automatically read the Go version from `.tool-versions`:
- No hardcoded versions in workflow files
- Single source of truth for Go version across local and CI environments
- Automatic version synchronization when `.tool-versions` is updated