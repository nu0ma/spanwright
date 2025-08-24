# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Instructions

### Quick Start
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test
```

### Usage Examples
```bash
# Create a new E2E test project (interactive mode)
npx spanwright my-project

# Non-interactive mode with environment variables
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=test-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema
npx spanwright my-project --non-interactive
```

### Development Commands

#### Build & Development
- `pnpm run build` - Build TypeScript CLI to `dist/` using tsdown
- `pnpm run dev` - Watch mode for development with auto-rebuild
- `pnpm run clean` - Remove build artifacts (`dist/` directory)
- `pnpm run prepare` - Build script (runs automatically on install)

#### Testing
- `pnpm test` - Run all tests (unit + E2E)
- `pnpm run test:unit` - Run unit tests with vitest
- `pnpm run test:e2e` - Run E2E integration tests

#### Code Quality
- `pnpm run lint` - Run ESLint with caching
- `pnpm run format` - Format code with Prettier

### Build System Details

#### tsdown Configuration
The project uses [tsdown](https://tsdown.dev/) for fast TypeScript compilation:
- **Entry point**: `src/index.ts`
- **Output**: `dist/` directory (ESM format)
- **Target**: Node.js 22
- **Features**: Tree-shaking, unused code elimination, clean builds

#### Build Output Structure
```
dist/
└── src/
    └── index.js    # Compiled CLI executable
```

#### Binary Configuration
- **CLI command**: `spanwright` (points to `dist/src/index.js`)
- **Package exports**: Main entry at `dist/index.js`
- **Published files**: `dist/` and `template/` directories



## Development Workflow

1. **Edit templates** in `template/` directory
2. **Build and test** with `pnpm run build && pnpm test`
3. **Commit changes** after tests pass

⚠️ **IMPORTANT**: Before committing changes, run `pnpm test` to ensure the E2E workflow continues to function correctly.


## Architecture Overview

Spanwright is a **project generator** that creates Cloud Spanner E2E testing frameworks with comprehensive tooling and automation.

### Two-Part Architecture
1. **Generator** (TypeScript CLI): Interactive project creation tool with configuration options
2. **Template** (Complete project scaffold): Go database tools + Playwright tests + Make workflows

### Configuration Modes
- **Interactive Mode (Default)**: Guided setup with prompts for database configuration
- **Non-Interactive Mode**: Environment variable configuration for automation
- **CI/CD Integration**: Full automation support with environment-driven setup

### Technology Stack
- **TypeScript**: CLI generator and Playwright test framework
- **Go**: High-performance database tools (validation, seeding, connection pooling)
- **Make**: Workflow automation and Docker orchestration
- **Playwright**: Browser automation with shared database configuration

### Key Components

#### CLI Generator (`src/`)
- **Interactive/Non-interactive modes**: Flexible project creation
- **Security-first file operations**: Path validation and secure template processing
- **Database configuration**: Support for 1 or 2 Spanner databases
- **Template customization**: Dynamic `.env` generation and file processing
- **Environment variable support**: Full CI/CD automation capabilities

#### Go Database Tools (`template/cmd/`)
- `seed-injector/`: SQL-based data seeding with direct DML execution
- Uses pooled connections and structured error handling

#### Internal Go Packages (`template/internal/`)
- `config/`: Environment validation and database configuration
- `db/`: Spanner client interfaces and pooled connection management
- `retry/`: Resilient operation patterns

#### Testing Framework
- **Scenario-based**: Each test scenario has minimal seed data and inline E2E tests
- **Database Configuration**: Shared database approach with environment-driven configuration
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
├── cmd/seed-injector/         # Go CLI tool for database seeding
├── internal/spanwright/        # Go internal packages
│   ├── config/               # Environment validation and database configuration
│   ├── db/                   # Spanner client interfaces and pooled connections
│   └── retry/                # Resilient operation patterns
├── scenarios/                  # Test scenarios (customizable templates)
│   ├── example-01-basic-setup/    # Basic single-table tests
│   ├── scenario-02-intermediate/  # Multi-table relationships
│   └── scenario-03-advanced/      # Complex business logic
├── tests/                      # Test infrastructure
│   ├── global-setup.ts        # Emulator startup and configuration
│   ├── global-teardown.ts     # Cleanup utilities
│   ├── db-config.ts          # Database configuration utilities
│   └── test-utils.ts         # Test helper functions
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
- **Automated Validation**: Integrated into `test` workflow
- **Template-based**: Validation files auto-generated from templates

## Testing Strategy

### Test Scenarios
Generated projects include three example scenarios that serve as templates:
- **example-01-basic-setup**: Basic database operations and validation
- **scenario-02-intermediate**: Multi-table relationships and complex queries  
- **scenario-03-advanced**: Complex business logic and cross-database operations

**Note**: These are templates for customization. Users should replace them with scenarios specific to their application's business logic.

### Scenario-Based Testing Structure
Each scenario contains:
1. **YAML fixtures**: Minimal seed data for testing (`fixtures/*.yml`)
2. **Expected state files**: Database validation definitions (`expected-*.yaml`)
3. **Playwright tests**: Browser automation with inline SQL validation (`tests/*.spec.ts`)

### Database Configuration
- **Multi-database support**: 1 or 2 Spanner databases per project
- **Environment-driven configuration**: Via environment variables or interactive prompts
- **Shared database approach**: Simplified setup without complex worker coordination

### Validation Flow
1. Start Spanner emulator (Docker)
2. Apply schema migrations (wrench)
3. Inject minimal seed data (testfixtures with YAML files)
4. Run browser tests (Playwright)
5. Validate database state (spalidate with YAML expectations)

## Development Notes

### Code Conventions
- **Go**: Standard Go project layout with internal packages
- **TypeScript**: Strict mode enabled, ES2020 target, CommonJS output
- **Make**: POSIX-compatible with environment variable integration
- **Testing**: Vitest for unit tests, custom E2E test runner
- **Linting**: ESLint with TypeScript rules, Prettier formatting
- **Coverage**: 85% statements, 90% branches, 95% functions

### Security Considerations
- **Path traversal protection**: All file operations validated
- **Input validation**: Comprehensive parameter checking
- **Secure template processing**: Safe string replacement with validation
- **Temporary file handling**: Secure creation and cleanup
- **Database ID format validation**: Strict format checking
- **File size limits**: Configuration file size restrictions
- **No secrets in templates**: All sensitive data externalized

### Performance Optimizations
- Pooled Spanner connections in Go tools
- Batch database operations
- Parallel test execution with isolation
- Connection reuse across operations

### Environment Requirements
- **Node.js**: >=22.15.1 for CLI, >=16.0.0 for generated projects
- **pnpm**: >=10.0.0 for package management
- **Docker**: Spanner emulator hosting
- **Go**: For database tools (version specified in .tool-versions)
- **wrench**: Spanner schema migration tool - `go install github.com/cloudspannerecosystem/wrench@latest`
- **spalidate**: Database validation tool from [github.com/nu0ma/spalidate](https://github.com/nu0ma/spalidate)
- **Version management**: `.tool-versions` as single source of truth (mise/asdf compatible)

## Version Management

### Version Management

The project uses `.tool-versions` as the single source of truth for tool versions (Go, Node.js). Update `.tool-versions` to synchronize versions across local and CI environments. Both `mise` and `asdf` can consume `.tool-versions`.


### Local Development with Version Management

#### Using mise (recommended)
```bash
# Install mise if not already installed
curl https://mise.run | sh

# Install tool versions from .tool-versions
mise install

# Use mise-managed tools respecting .tool-versions
mise use
```

#### Using asdf
```bash
# Install plugins as needed
asdf plugin add golang || true
asdf plugin add nodejs || true

# Install tool versions from .tool-versions
asdf install

# (Optional) set local versions from .tool-versions
asdf local golang $(grep '^go ' .tool-versions | awk '{print $2}')
asdf local nodejs $(grep -E '^(node|nodejs) ' .tool-versions | awk '{print $2}')
```

#### Manual Installation
If not using mise/asdf, manually install the versions pinned in `.tool-versions`.

### GitHub Actions Version Management

GitHub workflows read tool versions from `.tool-versions` (Go, Node.js):
- Avoid hardcoding versions in workflow files when possible
- Single source of truth across local and CI environments
- Automatic synchronization when `.tool-versions` is updated

## AI Assistant Guidelines

### Serena Tool Usage

When working with this codebase, AI assistants should utilize Serena tools for enhanced code analysis and navigation:

#### Code Analysis & Search
- **Symbol Discovery**: Use `find_symbol` to locate specific classes, functions, and methods
- **Reference Tracking**: Use `find_referencing_symbols` to understand code dependencies
- **Pattern Search**: Use `search_for_pattern` for content-based searches across files
- **Project Overview**: Use `get_symbols_overview` to understand codebase structure

#### Development Workflow Integration
- **Before Code Changes**: Always use Serena tools to understand existing code structure
- **Symbol Modification**: Use `replace_symbol_body` for targeted code updates
- **Code Insertion**: Use `insert_after_symbol` or `insert_before_symbol` for adding new code
- **Memory Management**: Utilize Serena's memory system to retain project insights

#### Best Practices
- Prefer Serena tools over simple text search when analyzing code structure
- Use `think_about_collected_information` after gathering data to synthesize findings
- Leverage `think_about_task_adherence` before making significant changes
- Always call `think_about_whether_you_are_done` when completing tasks