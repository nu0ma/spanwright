# Spanwright

A CLI tool for generating Cloud Spanner E2E testing framework projects that combine Go database tools with Playwright browser automation.

[![npm version](https://img.shields.io/npm/v/spanwright)](https://www.npmjs.com/package/spanwright)
[![CI](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml/badge.svg)](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nu0ma/spanwright)



## Quick Start

```bash
# Create a new E2E test project
npx spanwright your-project-name

# Navigate to the project
cd your-project-name

# Initial setup
make init

# Run all scenarios
make run-all-scenarios
```

## Features

**Generate a complete E2E testing environment with one command.** No more manual setup - get a production-ready testing framework that just works.

-  **Scenario Organization** - Structured tests with seed data, browser automation, and expected results
-  **Instant Setup** - `npx spanwright project-name` creates everything you need
-  **Playwright Integration** - Full browser automation with database state validation
-  **Auto Cleanup** - Built-in teardown ensures clean state between test runs
-  **Zero Config Docker** - Spanner emulator management out of the box

## Built With

Generated projects leverage battle-tested tools from the Cloud Spanner ecosystem:

- **[testfixtures](https://github.com/go-testfixtures/testfixtures)** - YAML-based database seeding with referential integrity support
- **[wrench](https://github.com/cloudspannerecosystem/wrench)** - Schema migration tool for Cloud Spanner
- **[spalidate](https://github.com/nu0ma/spalidate)** - Declarative database validation for asserting expected state
- **[Cloud Spanner Go Client](https://cloud.google.com/go/spanner)** - Official Google client with connection pooling
- **[Playwright](https://playwright.dev)** - Modern browser automation with multi-browser support

## Prerequisites

Make sure you have these tools installed:

- **Node.js** >= 22.0.0
- **Docker** - For running Spanner emulator
- **wrench** - Spanner schema migration tool ([installation guide](https://github.com/cloudspannerecosystem/wrench))
- **Go** - For database tools in generated projects

## Generated Project Structure

```
your-project-name/
├── Makefile                    # Workflow automation
├── schema/                     # Database schemas
│   ├── primary/               # Primary database schemas
│   │   ├── 001_initial_schema.sql
│   │   └── 002_products_schema.sql
│   └── secondary/             # Secondary database schemas (if 2-DB)
│       └── 001_analytics_schema.sql
├── cmd/                        # Go CLI tools
│   ├── db-validator/          # Database validation
│   └── seed-injector/         # Data seeding
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── seed-data/         # JSON seed files
│       ├── expected-*.yaml    # Expected results
│       └── tests/             # Playwright E2E tests
├── tests/                      # Test infrastructure
├── internal/                   # Go internal packages
└── playwright.config.ts       # Playwright configuration
```

## Usage Guide

If you want to verify the behavior, go to the [examples/two-databases](examples/two-databases) directory and run:

```bash
cd examples/two-databases
make run-all-scenarios
# 🚀 Running all scenarios...
# 🏗️ Setting up databases...
# 🐳 Starting fresh Spanner emulator...
```

### Project Generation

```bash
# Generate a new project
npx spanwright my-spanner-tests

# Follow the interactive prompts:
# - Project name
# - Number of databases (1 or 2)
# - Database IDs
# - Schema directory paths (supports multiple .sql files)
```

### Schema Management

Spanwright supports both single-file and multi-file schema approaches:

#### Single Schema File (Traditional)
```bash
schema/
└── schema.sql    # Single file with all DDL
```

#### Multiple Schema Files (Folder Mode)
```bash
schema/
├── 001_initial_schema.sql     # Core tables (Users, etc.)
├── 002_products_schema.sql    # Product-related tables
└── 003_analytics_schema.sql   # Analytics tables
```

**Benefits of Folder Mode:**
- Better organization for large schemas
- Incremental development with logical separation
- Team collaboration on different schema components
- Automatic sequential application (alphabetical order)

**Generated Projects Include:**
- Primary database: Multiple schema files by default
- Secondary database: Additional schema files (if 2-DB setup)
- Automatic detection and application of all `.sql` files in schema directories

### Generated Project Commands

```bash
# Initialize project (install dependencies, build tools)
make init

# Database operations
make start                  # Start Spanner emulator
make setup-all              # Apply all schema migrations
make stop                   # Stop emulator

# Scenario testing
make list-scenarios         # Show available scenarios
make run-scenario SCENARIO=example-01-basic-setup
make run-all-scenarios      # Run all scenarios

# Browser testing
make test-e2e              # Run Playwright tests
make test-e2e-ui          # Interactive test UI
make test-report          # Show test results

# Development
make clean                 # Clean build artifacts
make help                  # Show all commands
```

## Development

### Template Development

```bash
# Build and test the CLI
npm run build
npm test
```

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/semantic-release/) for automated versioning and publishing. Releases are triggered automatically when changes are merged to the main branch.

#### Commit Message Convention

We follow [Conventional Commits](https://conventionalcommits.org/) to determine version bumps:

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)  
- `BREAKING CHANGE:` - Breaking change (major version bump)
- `chore:`, `docs:`, `test:` - No release

#### Examples
```bash
feat: add support for custom database schemas
fix: resolve timeout issues in emulator startup
docs: update installation instructions
chore: update dependencies

# Breaking change
feat: redesign CLI interface

BREAKING CHANGE: The CLI interface has been completely redesigned.
Previous commands are no longer supported.
```

#### Release Workflow

1. **Create PR** with conventional commit messages
2. **Merge to main** triggers automatic release
3. **semantic-release** analyzes commits and:
   - Determines version bump
   - Updates CHANGELOG.md
   - Creates GitHub release
   - Publishes to npm
   - Commits updated files

## Examples

We provide working examples that you can try immediately:

### Databases Example
```bash
git clone https://github.com/nu0ma/spanwright.git
cd spanwright/examples/two-databases
make run-all-scenarios
```

See the [examples directory](examples/) for detailed documentation on each example.

### Creating Your Own Project
```bash
npx spanwright multi-db-tests
# Choose: 2 databases
# Primary DB: user-db, Schema directory: ./schemas/users
# Secondary DB: analytics-db, Schema directory: ./schemas/analytics
```

## Troubleshooting

### Common Issues

**Docker not running**
```bash
# Start Docker and try again
docker info
```

**wrench not found**
```bash
# Install wrench
go install github.com/cloudspannerecosystem/wrench@latest
```

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

**Disclaimer**: This tool is not affiliated with Google Cloud or the Cloud Spanner team. It's an independent project designed to facilitate E2E testing with Cloud Spanner.