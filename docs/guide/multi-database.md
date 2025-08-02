# Multi-Database Setup

Guide to configuring and testing with multiple Cloud Spanner databases in Spanwright projects.

## Overview

Spanwright supports projects with 1 or 2 Cloud Spanner databases, enabling you to test complex microservice architectures where different services use separate databases.

## Configuration

### Project Generation

When creating a new project, specify the number of databases:

```bash
npx spanwright
# Choose "2" when prompted for database count
```

### Environment Configuration

Multi-database projects generate environment variables for both database configurations:

```bash
# Environment variables (automatically generated in .env file)
PROJECT_ID=test-project
INSTANCE_ID=test-instance

# Primary Database
PRIMARY_DB_ID=primary-db
PRIMARY_DATABASE_ID=primary-db
PRIMARY_SCHEMA_PATH=./schema
PRIMARY_DB_SCHEMA_PATH=./schema

# Secondary Database  
SECONDARY_DB_ID=secondary-db
SECONDARY_DATABASE_ID=secondary-db
SECONDARY_SCHEMA_PATH=./schema2
SECONDARY_DB_SCHEMA_PATH=./schema2

# Database Count
DB_COUNT=2

# Spanner Emulator
SPANNER_EMULATOR_HOST=localhost:9010
```

**Note**: The generator creates both `PRIMARY_DB_ID` and `PRIMARY_DATABASE_ID` for compatibility with different components. The Makefile uses `_DB_ID` variants while Go configuration loads `_DATABASE_ID` variants.

## Database Schema Management

### Directory Structure

```
your-project/
├── schema/                     # Primary database schemas (./schema)
│   ├── 001_initial_schema.sql
│   ├── 002_add_users_table.sql
│   └── 003_add_user_profiles.sql
├── schema2/                    # Secondary database schemas (./schema2)
│   ├── 001_initial_schema.sql
│   ├── 002_add_products_table.sql
│   └── 003_add_categories.sql
├── scenarios/
└── Makefile
```

## Testing with Multiple Databases

### Test Scenario Structure

```
scenarios/example-01-basic-setup/
├── fixtures/
│   ├── primary/                # Primary database fixtures
│   │   ├── Users.yml
│   │   └── Products.yml
│   └── secondary/              # Secondary database fixtures
│       ├── UserLogs.yml
│       └── Analytics.yml
├── expected-primary.yaml       # Expected primary DB state
├── expected-secondary.yaml     # Expected secondary DB state
└── tests/
    └── simple-test.spec.ts
```

### Fixture Organization

**Primary database fixtures:**
```yaml
# fixtures/primary/Users.yml
- UserID: "user-001"
  Name: "E2E Test User"
  Email: "e2e-test-user@example.com"
  Status: 1
  CreatedAt: "2024-01-01T00:00:00Z"
```

```yaml
# fixtures/primary/Products.yml
- ProductID: "product-001"
  Name: "E2E Test Product"
  Price: 1000
  CategoryID: "category-001"
  IsActive: true
```

**Secondary database fixtures:**
```yaml
# fixtures/secondary/UserLogs.yml
- LogID: "log-001"
  UserID: "user-001"
  Action: "login"
  IpAddress: "127.0.0.1"
  UserAgent: "E2E-Test-Agent/1.0"
  CreatedAt: "2024-01-01T00:00:00Z"
```

```yaml
# fixtures/secondary/Analytics.yml
- AnalyticsID: "analytics-001"
  UserID: "user-001"
  EventType: "page_view"
  PageURL: "/test-page"
  Timestamp: "2024-01-01T00:00:00Z"
```

### Cross-Database Testing

```typescript
// tests/simple-test.spec.ts
import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('Multi-Database Integration', () => {
  test('Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    // Validate primary database using spalidate
    const primaryValid = validateDatabaseState('example-01-basic-setup', 'primary');
    expect(primaryValid).toBe(true);
    
    // Validate secondary database (if DB_COUNT=2)
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateDatabaseState('example-01-basic-setup', 'secondary');
      expect(secondaryValid).toBe(true);
    }
    
    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });

  test('should handle cross-database workflow', async ({ page }) => {
    // Navigate to application
    await page.goto('https://example.com');
    
    // Perform user actions that affect both databases
    await page.fill('[data-testid="email"]', 'e2e-test-user@example.com');
    await page.click('[data-testid="submit"]');
    
    // Verify UI response
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Validate both databases
    const primaryValid = validateDatabaseState('example-01-basic-setup', 'primary');
    expect(primaryValid).toBe(true);
    
    const secondaryValid = validateDatabaseState('example-01-basic-setup', 'secondary');
    expect(secondaryValid).toBe(true);
  });
});
```

## Database Operations

### Setup Commands

**Note**: Ensure environment variables are set before running commands.

```bash
# Setup both databases with schemas and seed data
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make setup

# Setup primary database only
PRIMARY_SCHEMA_PATH=./schema make setup-primary

# Setup secondary database only  
SECONDARY_SCHEMA_PATH=./schema2 make setup-secondary
```

### Testing Commands

```bash
# Run specific scenario
make test-scenario SCENARIO=example-01-basic-setup

# Run all scenarios
make run-all-scenarios

# Run Playwright tests only
make test-e2e
```

### Validation Commands

```bash
# Validate scenario databases
make validate-scenario SCENARIO=example-01-basic-setup

# Validate current scenario databases
make validate-db

# Validate configuration and schema paths
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make validate
```

## Validation

### Multi-Database Validation Files

Create expected state files for each database using spalidate format:

```yaml
# expected-primary.yaml
tables:
  Users:
    count: 1
    columns:
      UserID: "user-001"
      Name: "E2E Test User"
      Email: "e2e-test-user@example.com"
      Status: 1
      # CreatedAt: "2024-01-01T00:00:00Z"  # Commented out for flexible timestamp validation
  
  Products:
    count: 1
    columns:
      ProductID: "product-001"
      Name: "E2E Test Product"
      Price: 1000
      CategoryID: "category-001"
      IsActive: true
```

```yaml
# expected-secondary.yaml
tables:
  Analytics:
    count: 1
    columns:
      AnalyticsID: "analytics-001"
      UserID: "user-001"
      EventType: "page_view"
      Timestamp: "2024-01-01T00:00:00Z"
      PageURL: "/test-page"

  UserLogs:
    count: 1
    columns:
      LogID: "log-001"
      UserID: "user-001"
      Action: "login"
      CreatedAt: "2024-01-01T00:00:00Z"
      IpAddress: "127.0.0.1"
```

### Spalidate Integration

The validation system uses [spalidate](https://github.com/nu0ma/spalidate) CLI tool:

```bash
# Primary database validation
SPANNER_EMULATOR_HOST=localhost:9010 spalidate \
  --project test-project \
  --instance test-instance \
  --database primary-db \
  --verbose scenarios/example-01-basic-setup/expected-primary.yaml

# Secondary database validation  
SPANNER_EMULATOR_HOST=localhost:9010 spalidate \
  --project test-project \
  --instance test-instance \
  --database secondary-db \
  --verbose scenarios/example-01-basic-setup/expected-secondary.yaml
```

## Configuration Management

### Go Configuration Structure

The actual Go configuration loads environment variables:

```go
// Config represents the complete application configuration
type Config struct {
    ProjectID       string  // From PROJECT_ID
    InstanceID      string  // From INSTANCE_ID
    EmulatorHost    string  // From SPANNER_EMULATOR_HOST
    PrimaryDB       string  // From PRIMARY_DATABASE_ID
    SecondaryDB     string  // From SECONDARY_DATABASE_ID
    PrimarySchema   string  // From PRIMARY_SCHEMA_PATH
    SecondarySchema string  // From SECONDARY_SCHEMA_PATH
    Environment     string
    Timeout         int
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
    _ = godotenv.Load()

    config := &Config{
        ProjectID:       os.Getenv("PROJECT_ID"),
        InstanceID:      os.Getenv("INSTANCE_ID"),
        EmulatorHost:    os.Getenv("SPANNER_EMULATOR_HOST"),
        PrimaryDB:       os.Getenv("PRIMARY_DATABASE_ID"),     // Note: _DATABASE_ID variant
        SecondaryDB:     os.Getenv("SECONDARY_DATABASE_ID"),   // Note: _DATABASE_ID variant
        PrimarySchema:   os.Getenv("PRIMARY_SCHEMA_PATH"),
        SecondarySchema: os.Getenv("SECONDARY_SCHEMA_PATH"),
        Environment:     getEnvWithDefault("ENVIRONMENT", "development"),
        Timeout:         getEnvIntWithDefault("TIMEOUT_SECONDS", 120),
    }

    return config, config.Validate()
}

// GetDatabaseConfig returns a DatabaseConfig for the specified database ID
func (c *Config) GetDatabaseConfig(databaseID string) *DatabaseConfig {
    return &DatabaseConfig{
        ProjectID:  c.ProjectID,
        InstanceID: c.InstanceID,
        DatabaseID: databaseID,
    }
}
```

### Database Connection Management

```go
// DatabaseConfig represents database connection configuration
type DatabaseConfig struct {
    ProjectID  string
    InstanceID string
    DatabaseID string
}

// DatabasePath returns the full database path
func (dc *DatabaseConfig) DatabasePath() string {
    return fmt.Sprintf("projects/%s/instances/%s/databases/%s", 
        dc.ProjectID, dc.InstanceID, dc.DatabaseID)
}
```

### Test Database Configuration

```typescript
// Database configuration for tests
export interface DatabaseConfig {
  processId: number;        // Process identifier for isolation
  primaryDbId: string;      // Primary database ID
  secondaryDbId: string;    // Secondary database ID
}

// Validation function signature
export function validateDatabaseState(
  scenario: string, 
  database: 'primary' | 'secondary', 
  databaseId?: string       // Optional override for database ID
): boolean
```

## Development Workflow

### Local Development

```bash
# Start emulator and apply schemas
make start

# Initialize project
make init

# Setup databases (with required environment variables)
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make setup

# Run development tests
make test-e2e
```

### Testing Workflow

```bash
# Run specific multi-database scenario
make test-scenario SCENARIO=example-01-basic-setup

# Run all scenarios with validation
make run-all-scenarios

# Clean and reset
make clean
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make setup
```

### Creating New Scenarios

```bash
# Create new scenario structure
make new-scenario SCENARIO=my-test-scenario

# This creates:
# scenarios/my-test-scenario/
# ├── expected-primary.yaml
# ├── expected-secondary.yaml (if DB_COUNT=2)
# ├── fixtures/
# │   ├── primary/
# │   └── secondary/
# └── tests/
```

**Note**: The `new-scenario` target requires template files (`expected-primary.yaml.template`, `expected-secondary.yaml.template`) to exist in the project root.

## Seed Data Management

### Seed Injection Process

The seed-injector tool processes fixture data:

```bash
# Primary database seeding
SPANNER_EMULATOR_HOST=localhost:9010 go run cmd/seed-injector/main.go \
  --database-id primary-db \
  --fixture-dir "$(pwd)/scenarios/example-01-basic-setup/fixtures/primary"

# Secondary database seeding
SPANNER_EMULATOR_HOST=localhost:9010 go run cmd/seed-injector/main.go \
  --database-id secondary-db \
  --fixture-dir "$(pwd)/scenarios/example-01-basic-setup/fixtures/secondary"
```

### Makefile Integration

The Makefile handles multi-database seeding automatically:

```makefile
setup-primary: ## Setup primary database
	@echo "🔶 Setting up primary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go \
		--database-id $(PRIMARY_DB_ID) \
		--fixture-dir "$(pwd)/scenarios/$(SCENARIO)/fixtures/primary"

setup-secondary: ## Setup secondary database  
	@echo "☁️ Setting up secondary database..."
	@SPANNER_EMULATOR_HOST=localhost:$(DOCKER_SPANNER_PORT) go run cmd/seed-injector/main.go \
		--database-id $(SECONDARY_DB_ID) \
		--fixture-dir "$(pwd)/scenarios/$(SCENARIO)/fixtures/secondary"
```

## Best Practices

### Database Design

1. **Clear separation** - Each database should have distinct responsibilities
2. **Minimal coupling** - Avoid tight coupling between databases
3. **Consistent naming** - Use consistent naming conventions across databases
4. **Document relationships** - Clearly document cross-database relationships

### Testing Strategy

1. **Test boundaries** - Focus on service boundaries and interactions
2. **Independent validation** - Validate each database independently using spalidate
3. **Cross-service flows** - Test complete user journeys across services
4. **Data consistency** - Ensure referential integrity across databases

### Performance

1. **Connection pooling** - Reuse connections across databases
2. **Batch operations** - Minimize round trips
3. **Parallel testing** - Run independent tests in parallel
4. **Resource cleanup** - Clean up test data efficiently

## Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Check emulator status
docker ps | grep spanner-emulator

# Restart emulator
make stop && make start

# Verify configuration (ensure environment variables are set)
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make validate
```

**Environment variable issues:**
```bash
# Check all required environment variables
env | grep -E "(PROJECT_ID|INSTANCE_ID|DB_ID|SCHEMA_PATH)"

# Verify .env file contains both _DB_ID and _DATABASE_ID variants
cat .env | grep -E "(PRIMARY|SECONDARY).*ID"
```

**Schema inconsistencies:**
```bash
# Reset and reapply schemas
make clean
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make setup
```

**Cross-database timing issues:**
- Use proper waits between operations
- Implement retry logic for eventual consistency
- Add explicit synchronization points

### Debugging

**Check database state:**
```bash
# Inspect database configuration
PRIMARY_SCHEMA_PATH=./schema SECONDARY_SCHEMA_PATH=./schema2 make validate

# View emulator logs
docker logs spanner-emulator
```

**Validate environment:**
```bash
# Check environment variables
env | grep -E "(PROJECT_ID|INSTANCE_ID|DB_ID|SCHEMA_PATH)"

# Test database connections
make validate-scenario SCENARIO=example-01-basic-setup
```

**Enable debug output:**
```bash
# Run with debug information
DEBUG=1 make test-scenario SCENARIO=example-01-basic-setup
```

## Examples

See [Multi-Database Examples](../examples/multi-database) for complete implementation examples.