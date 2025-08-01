# CLI Commands

## Project Generation

### `npx spanwright <project-name>`

Creates a new Spanwright project with interactive setup.

```bash
npx spanwright my-spanner-tests
```

**Interactive Prompts:**
- Number of databases (1 or 2)
- Primary database name
- Primary schema path
- Secondary database configuration (if 2 databases)

### Non-Interactive Mode

Use environment variables to skip prompts:

```bash
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=my-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema

npx spanwright my-project --non-interactive
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `SPANWRIGHT_DB_COUNT` | Number of databases (1 or 2) | `1` |
| `SPANWRIGHT_PRIMARY_DB_NAME` | Primary database name | `primary-db` |
| `SPANWRIGHT_PRIMARY_SCHEMA_PATH` | Path to primary schema files | `./schema` |
| `SPANWRIGHT_SECONDARY_DB_NAME` | Secondary database name | `secondary-db` |
| `SPANWRIGHT_SECONDARY_SCHEMA_PATH` | Path to secondary schema files | `./schema2` |

## Command Line Flags

### `--help`, `-h`

Display help information:

```bash
npx spanwright --help
```

### `--version`, `-v`

Show version information:

```bash  
npx spanwright --version
```

### `--non-interactive`

Skip interactive prompts and use environment variables:

```bash
npx spanwright my-project --non-interactive
```

## Generated Project Commands

After creating a project, use these `make` commands:

### Project Setup

```bash
# Install all dependencies and build tools
make init

# Check that required tools are available
make check-tools

# Setup Playwright browser binaries
make setup-playwright
```

### Database Operations

```bash
# Start Spanner emulator in Docker
make start

# Stop Spanner emulator
make stop

# Apply all database schemas
make setup-all

# Setup specific database
make setup-primary    # Primary database only
make setup-secondary  # Secondary database only (if 2-DB setup)
```

### Testing

```bash
# Run all test scenarios (recommended)
make run-all-scenarios

# Run specific scenario
make run-scenario SCENARIO=example-01-basic-setup

# List available scenarios
make list-scenarios

# Run only Playwright tests (without seeding/validation)
make test-e2e

# Run Playwright tests with UI
make test-e2e-ui

# Generate test report
make test-report
```

### Development

```bash
# Show all available commands
make help

# Clean build artifacts and databases
make clean

# Build Go tools
make build-go

# Run linting
make lint
```

## Advanced Usage

### Custom Configuration

Override default settings in your `.env` file:

```bash
# Custom Docker settings
DOCKER_IMAGE=gcr.io/cloud-spanner-emulator/emulator:latest
DOCKER_SPANNER_PORT=9010
DOCKER_ADMIN_PORT=9020

# Custom timeout settings
TIMEOUT_SECONDS=300
DOCKER_STARTUP_WAIT=10
```

### Schema Validation

Use with [spalidate](https://github.com/nu0ma/spalidate) for comprehensive database validation:

```bash
# Validate database state matches expectations
make validate-primary
make validate-secondary

# Validate with verbose output
make validate-primary-verbose
```

### CI/CD Integration

Environment variables for automated pipelines:

```bash
# Skip interactive prompts
export CI=true

# Use specific versions
export SPANNER_EMULATOR_VERSION=latest
export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

## Error Handling

Common error scenarios and solutions:

### Project Already Exists

```bash
Error: Directory 'my-project' already exists
```

**Solution:** Use a different project name or remove the existing directory.

### Missing Dependencies

```bash
Error: wrench not found
```

**Solution:** Install required tools:
```bash
go install github.com/cloudspannerecosystem/wrench@latest
```

### Permission Issues

```bash
Error: Permission denied creating directory
```

**Solution:** Ensure you have write permissions in the current directory.

### Docker Not Running

```bash
Error: Cannot connect to Docker daemon
```

**Solution:** Start Docker and ensure it's running:
```bash
docker info
```