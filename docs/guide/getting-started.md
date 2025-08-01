# Getting Started

## Installation

Spanwright requires Node.js 22.0.0 or higher and a few external tools.

### Prerequisites

Install these tools first:

```bash
# Node.js (>= 22.0.0)
node --version

# Docker (for Spanner emulator)
docker --version

# Go (for database tools)
go version

# wrench (Spanner schema migrations)
go install github.com/cloudspannerecosystem/wrench@latest

# spalidate (database validation)
# Install from: https://github.com/nu0ma/spalidate
```

## Creating Your First Project

### Interactive Setup

```bash
# Create a new project
npx spanwright my-spanner-tests

# Follow the prompts:
# ✓ Select number of databases (1 or 2)
# ✓ Primary DB name (default: primary-db)  
# ✓ Primary DB schema path (e.g., ./schema)
# ✓ Secondary DB setup (if 2 databases selected)
```

### Non-Interactive Setup

Use environment variables for automated setup:

```bash
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=my-primary-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schemas/primary

npx spanwright my-project --non-interactive
```

## Initialize the Project

```bash
cd my-spanner-tests

# Install dependencies and setup tools
make init

# Verify setup
make help
```

## Your First Test Run

```bash
# Start Spanner emulator
make start

# Apply database schemas
make setup-all

# Run all test scenarios
make run-all-scenarios
```

This will:
1. 🐳 Start Docker Spanner emulator
2. 🗄️ Apply your database schemas
3. 🌱 Inject seed data from YAML fixtures  
4. 🎭 Run Playwright E2E tests
5. ✅ Validate expected database state

## Project Structure Overview

```
my-spanner-tests/
├── schema/                     # Database schemas
│   ├── 001_users.sql
│   └── 002_products.sql
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── fixtures/           # YAML seed data
│       │   ├── Users.yml
│       │   └── Products.yml
│       ├── expected-primary.yaml  # Expected state
│       └── tests/              # Playwright tests
│           └── basic.spec.ts
├── cmd/seed-injector/         # Go seeding tool  
├── tests/                     # Test infrastructure
└── Makefile                   # Workflow commands
```

## Next Steps

- [Project Structure](./project-structure) - Understand the generated files
- [Schema Management](./schema-management) - Organize your database schemas
- [Writing Tests](./writing-tests) - Create Playwright E2E tests
- [Database Seeding](./database-seeding) - Manage test data with YAML