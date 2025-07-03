# Spanwright Examples

This directory contains working examples of Spanwright projects that you can use to understand how to use the tool.

## Available Examples

### 🔢 Single Table Example
**Path**: `examples/single-table/`

A minimal example with:
- **1 database** (Primary)
- **1 table** (Users)
- **Basic E2E tests**

Perfect for getting started with Spanwright.

### 🗄️ Two Databases Example
**Path**: `examples/two-databases/`

A more comprehensive example with:
- **2 Spanner databases** (Primary and Secondary)
- **Separate tables** (Users in Primary DB, Logs in Secondary DB)
- **Cross-database E2E tests**

Demonstrates multi-database testing scenarios.

## Quick Start

### Option 1: Clone and Run
```bash
# Clone the repository
git clone https://github.com/nu0ma/spanwright.git

# Try the single table example
cd spanwright/examples/single-table
make run-all-scenarios

# Try the two databases example
cd ../two-databases
make run-all-scenarios
```

### Option 2: Generate Your Own Project
```bash
# Install Spanwright
npm install -g spanwright

# Create your own project
spanwright create my-project

# Follow the interactive prompts
cd my-project
make run-all-scenarios
```

## Example Structure

Each example contains:
- **`schemas/`** - Database schema files
- **`scenarios/`** - Test scenarios with seed data and E2E tests
- **`Makefile`** - Commands for running tests
- **`README.md`** - Example-specific instructions
- **Complete Spanwright project** - Ready to run

## Usage Patterns

### Running Tests
```bash
# Initialize the project
make init

# Run all scenarios
make run-all-scenarios

# Run specific scenario
make setup-scenario SCENARIO=scenario-01-basic-setup
make validate-scenario SCENARIO=scenario-01-basic-setup
make test-e2e-scenario SCENARIO=scenario-01-basic-setup

# Clean up
make stop
```

### Common Commands
- `make help` - Show all available commands
- `make start` - Start Spanner emulator
- `make setup-all` - Create database schemas
- `make test-e2e` - Run Playwright tests
- `make clean` - Clean up all resources

## Learning Path

1. **Start with Single Table** - Understand basic concepts
2. **Move to Two Databases** - Learn multi-database patterns
3. **Create Your Own** - Apply knowledge to your use case

## Requirements

- **Docker** - For Spanner emulator
- **Node.js** >=16.0.0 - For Playwright tests
- **Go** - For database tools
- **wrench** - For schema migrations

## Getting Help

- Check individual example README files
- Visit the [main repository](https://github.com/nu0ma/spanwright)
- Review the [documentation](https://github.com/nu0ma/spanwright#readme)

---

*These examples are automatically generated and updated when Spanwright templates change.*