# Spanwright

A CLI tool for generating Cloud Spanner E2E testing framework projects that combine Go database tools with Playwright browser automation.

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

- **Flexible Database Configuration**: Support for single or dual Spanner databases
- **Multi-File Schema Support**: Directory-based schema management with automatic SQL file application
- **Interactive Project Setup**: CLI guides you through database configuration
- **Playwright Integration**: Browser automation with database validation
- **Scenario-Based Testing**: Structured test organization with YAML configuration
- **Docker Integration**: Automated Spanner emulator management
- **High-Performance Tools**: Go-based database validation and seeding
- **Make-Based Workflows**: Automated development and testing workflows

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

### Testing Architecture

Generated projects provide:

1. **Database Tools** (Go):
   - `db-validator`: Batch validation with performance metrics
   - `seed-injector`: Data seeding with type conversion
   - Connection pooling and error handling

2. **Browser Tests** (Playwright):
   - Database isolation for parallel execution
   - Scenario-based test organization
   - Automatic cleanup and teardown

3. **Workflow Integration**:
   - Make-based automation
   - Docker compose for services
   - Environment-based configuration

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

### 🔢 Single Table Example
```bash
git clone https://github.com/nu0ma/spanwright.git
cd spanwright/examples/single-table
make run-all-scenarios
```

### 🗄️ Two Databases Example
```bash
git clone https://github.com/nu0ma/spanwright.git
cd spanwright/examples/two-databases
make run-all-scenarios
```

See the [examples directory](examples/) for detailed documentation on each example.

### Creating Your Own Project

#### Single Database Setup
```bash
npx spanwright my-app-tests
# Choose: 1 database
# Database ID: app-db
# Schema directory: ./schemas/app
```

#### Dual Database Setup
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

**Permission denied on make commands**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## Architecture

Spanwright generates projects with a hybrid architecture:

- **Go Tools**: High-performance database operations
- **TypeScript/Playwright**: Browser automation and test framework
- **Docker**: Isolated development environment
- **Make**: Cross-platform workflow automation

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

**Disclaimer**: This tool is not affiliated with Google Cloud or the Cloud Spanner team. It's an independent project designed to facilitate E2E testing with Cloud Spanner.