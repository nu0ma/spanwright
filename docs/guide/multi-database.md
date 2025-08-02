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

Multi-database projects generate a `.env` file with both database configurations:

```bash
# .env (generated for 2-database setup)
SPANNER_PROJECT_ID=your-project-id
SPANNER_INSTANCE_ID=your-instance-id

# Primary Database
PRIMARY_DB_NAME=user-service-db
PRIMARY_SCHEMA_PATH=schemas/user-service

# Secondary Database  
SECONDARY_DB_NAME=product-service-db
SECONDARY_SCHEMA_PATH=schemas/product-service

# Shared Configuration
BASE_URL=http://localhost:3000
PLAYWRIGHT_HEADED=false
```

## Database Schema Management

### Directory Structure

```
your-project/
├── schemas/
│   ├── user-service/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_users_table.sql
│   │   └── 003_add_user_profiles.sql
│   └── product-service/
│       ├── 001_initial_schema.sql
│       ├── 002_add_products_table.sql
│       └── 003_add_categories.sql
├── scenarios/
└── Makefile
```

## Testing with Multiple Databases

### Test Scenario Structure

```
scenarios/example-02-cross-service/
├── fixtures/
│   ├── primary/          # Primary database fixtures
│   │   ├── Users.yml
│   │   └── UserProfiles.yml
│   └── secondary/        # Secondary database fixtures
│       ├── Products.yml
│       └── Categories.yml
├── expected-primary.yaml     # Expected primary DB state
├── expected-secondary.yaml   # Expected secondary DB state
└── tests/
    └── cross-service.spec.ts
```

### Fixture Organization

**Primary database fixtures:**
```yaml
# fixtures/primary/Users.yml
- UserID: "user-001"
  Email: "test@example.com"
  Name: "Test User"
  Status: "active"
  CreatedAt: "2024-01-01T00:00:00Z"

- UserID: "user-002"
  Email: "admin@example.com"
  Name: "Admin User"
  Status: "active"
  CreatedAt: "2024-01-01T00:00:00Z"
```

**Secondary database fixtures:**
```yaml
# fixtures/secondary/Products.yml
- ProductID: "prod-001"
  Name: "Test Product"
  Price: 1000
  CategoryID: "cat-001"
  CreatedAt: "2024-01-01T00:00:00Z"

- ProductID: "prod-002"
  Name: "Premium Product"
  Price: 2000
  CategoryID: "cat-001"
  CreatedAt: "2024-01-01T00:00:00Z"
```

### Cross-Database Testing

```typescript
// tests/cross-service.spec.ts
import { test, expect } from '@playwright/test';
import { 
  validateDatabaseState,      // Primary database
  validateSecondaryDatabase   // Secondary database
} from '../../../tests/utils/sql-validator';

test.describe('Cross-Service Integration', () => {
  test('should create order linking user and product', async ({ page }) => {
    // Navigate to product catalog
    await page.goto('/products');
    
    // Select product (stored in secondary DB)
    await page.click('[data-testid="product-prod-001"]');
    await page.click('[data-testid="add-to-cart"]');
    
    // Login as user (stored in primary DB)
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login"]');
    
    // Complete checkout
    await page.goto('/checkout');
    await page.click('[data-testid="place-order"]');
    
    // Verify success
    await expect(page.locator('.order-confirmation')).toBeVisible();
    
    // Validate primary database (user and order data)
    const orderData = await validateDatabaseState('example-01-basic-setup', 'primary');
    expect(orderData).toHaveLength(1);
    expect(orderData[0].Email).toBe('test@example.com');
    
    // Validate secondary database (product inventory)
    const productData = await validateDatabaseState( 'example-01-basic-setup', 'secondary');
    expect(productData[0].InventoryCount).toBe(9); // Decremented from 10
  });
});
```

## Database Seeding

### Multi-Database Seeding

The seed-injector tool handles both databases automatically:

```bash
# Seed both databases
make seed-all

# Seed primary database only
make seed-primary

# Seed secondary database only
make seed-secondary
```

### Makefile Configuration

```makefile
# Multi-database seeding targets
seed-all: seed-primary seed-secondary

seed-primary:
	@echo "🌱 Seeding primary database..."
	./cmd/seed-injector/seed-injector \
		-db-name=$(PRIMARY_DB_NAME) \
		-fixtures-dir=fixtures/primary

seed-secondary:
	@echo "🌱 Seeding secondary database..."  
	./cmd/seed-injector/seed-injector \
		-db-name=$(SECONDARY_DB_NAME) \
		-fixtures-dir=fixtures/secondary
```

## Validation

### Multi-Database Validation

Create expected state files for each database:

```yaml
# expected-primary.yaml
tables:
  Users:
    count: 2
    conditions:
      - column: "Status"
        value: "active"
        count: 2
        
  Orders:
    count: 1
    conditions:
      - column: "UserID"
        value: "user-001"
        count: 1
```

```yaml
# expected-secondary.yaml
tables:
  Products:
    count: 2
    conditions:
      - column: "Price"
        operator: ">"
        value: 0
        count: 2
        
  Categories:
    count: 1
    conditions:
      - column: "Name"
        value: "Electronics"
        count: 1
```

### Running Validation

```bash
# Validate both databases
make validate-all

# Validate individual databases
make validate-primary
make validate-secondary
```

## Configuration Management

### Environment Validation

The configuration system validates database setup:

```go
// internal/config/config.go (auto-generated)
type Config struct {
    SpannerProjectID     string `env:"SPANNER_PROJECT_ID,required"`
    SpannerInstanceID    string `env:"SPANNER_INSTANCE_ID,required"`
    
    // Primary Database
    PrimaryDBName        string `env:"PRIMARY_DB_NAME,required"`
    PrimarySchemaPath    string `env:"PRIMARY_SCHEMA_PATH,required"`
    
    // Secondary Database (conditional)
    SecondaryDBName      string `env:"SECONDARY_DB_NAME"`
    SecondarySchemaPath  string `env:"SECONDARY_SCHEMA_PATH"`
    
    DBCount             int    `env:"DB_COUNT,default=1"`
}
```

### Conditional Logic

Generated code includes conditional database handling:

```go
// Database connection setup
func (c *Config) GetDatabaseNames() []string {
    databases := []string{c.PrimaryDBName}
    if c.DBCount == 2 && c.SecondaryDBName != "" {
        databases = append(databases, c.SecondaryDBName)
    }
    return databases
}
```

## Development Workflow

### Local Development

```bash
# Start emulator and apply schemas
make start

# Run development server
npm run dev

# Run tests with hot reload
make watch-tests
```

### Testing Workflow

```bash
# Run specific multi-database scenario
make run-scenario SCENARIO=example-02-cross-service

# Run all scenarios
make run-all-scenarios

# Clean and reset
make clean-databases
make apply-schemas
```

## Best Practices

### Database Design

1. **Clear separation** - Each database should have distinct responsibilities
2. **Minimal coupling** - Avoid tight coupling between databases
3. **Consistent naming** - Use consistent naming conventions across databases
4. **Document relationships** - Clearly document cross-database relationships

### Testing Strategy

1. **Test boundaries** - Focus on service boundaries and interactions
2. **Independent validation** - Validate each database independently
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
# Check both databases are accessible
make validate-connections

# Restart emulator
make stop && make start
```

**Schema inconsistencies:**
```bash
# Reset and reapply schemas
make clean-databases
make apply-schemas
```

**Cross-database timing issues:**
- Use proper waits between operations
- Implement retry logic for eventual consistency
- Add explicit synchronization points

### Debugging

**Check database state:**
```bash
# Inspect primary database
make shell-primary

# Inspect secondary database  
make shell-secondary
```

**Log database operations:**
```bash
# Enable connection logging
DEBUG=spanner make run-scenario SCENARIO=example-02-cross-service
```

## Migration from Single Database

### Automated Migration

Use the update script to add a second database:

```bash
# Generate new multi-database configuration
npx spanwright migrate --add-database

# Follow prompts to configure second database
```

### Manual Migration

1. **Update environment:**
   - Add secondary database variables to `.env`
   - Set `DB_COUNT=2`

2. **Create schema directory:**
   ```bash
   mkdir -p schemas/secondary-service
   ```

3. **Update Makefile:**
   - Add secondary database targets
   - Update validation commands

4. **Migrate fixtures:**
   ```bash
   mkdir -p fixtures/secondary
   # Move relevant fixtures
   ```

## Examples

See [Multi-Database Examples](../examples/multi-database) for complete implementation examples.