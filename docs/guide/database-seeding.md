# Database Seeding

## Overview

Spanwright uses YAML fixtures with the [testfixtures](https://github.com/go-testfixtures/testfixtures) library for database seeding. Each test scenario includes minimal, focused seed data that supports the specific test case.

## Fixture File Structure

```
scenarios/example-01-basic-setup/
└── fixtures/
    ├── Users.yml          # User records
    ├── Products.yml       # Product records
    └── Orders.yml         # Order records
```

## YAML Fixture Format

### Basic Syntax

```yaml
# fixtures/Users.yml
- UserID: "user-001"
  Email: "alice@example.com"
  Name: "Alice Johnson"
  Status: "active"
  CreatedAt: "2024-01-01T10:00:00Z"

- UserID: "user-002"
  Email: "bob@example.com"
  Name: "Bob Smith"
  Status: "active"
  CreatedAt: "2024-01-01T11:00:00Z"
```

### Data Types and Formatting

#### Strings
```yaml
- UserID: "user-123"           # UUID or custom ID
  Email: "user@example.com"    # Email format
  Name: "John Doe"             # Free text
  Status: "active"             # Enum values
```

#### Numbers
```yaml
- ProductID: "prod-001"
  Price: 1500                  # INT64
  Weight: 2.5                  # FLOAT64
  Quantity: 10                 # INT64
```

#### Timestamps
```yaml
- OrderID: "order-001"
  CreatedAt: "2024-01-15T14:30:00Z"     # ISO 8601 format
  UpdatedAt: "2024-01-15T15:45:00Z"     # UTC timezone
```

#### Arrays (Spanner ARRAY columns)
```yaml
- ProductID: "prod-001"
  Tags: ["electronics", "mobile", "smartphone"]
  Prices: [999, 1099, 1199]
```

#### NULL Values
```yaml
- UserID: "user-001"
  Email: "user@example.com"
  LastLoginAt: null            # Explicitly null
  # OR simply omit the field for null
```

## Seeding Process

### Automatic Seeding

```bash
# Seed data is injected automatically during scenario runs
make run-scenario SCENARIO=example-01-basic-setup
```

### Manual Seeding

```bash
# Seed specific scenario
make seed-scenario SCENARIO=example-01-basic-setup

# Or use the Go tool directly
./cmd/seed-injector/seed-injector \
  -project-id=test-project \
  -instance-id=test-instance \
  -database-id=primary-db \
  -fixtures-dir=scenarios/example-01-basic-setup/fixtures
```

## Go Seed Injector Tool

### Tool Configuration

```go
// cmd/seed-injector/main.go features:
// - Pooled Spanner connections for performance
// - Batch operations to reduce N+1 queries
// - Structured error handling
// - Transaction support for data integrity
```

### Environment Variables

```bash
# Required for seeding
SPANNER_EMULATOR_HOST=localhost:9010
PRIMARY_DB_NAME=my-primary-db
SECONDARY_DB_NAME=my-secondary-db  # Optional
```

## Fixture Best Practices

### Minimal Data Principle

**Good - Minimal and focused:**
```yaml
# fixtures/Users.yml (for login test)
- UserID: "test-user"
  Email: "test@example.com"
  Password: "$2a$10$hashed_password"
  Status: "active"
```

**Avoid - Too much data:**
```yaml
# Don't create dozens of users unless specifically testing pagination
- UserID: "user-001"
- UserID: "user-002"
# ... 50 more users
```

### Consistent IDs

Use descriptive, consistent IDs across fixtures:

```yaml
# fixtures/Users.yml
- UserID: "admin-user"
  Email: "admin@example.com"
  Role: "admin"

# fixtures/Orders.yml  
- OrderID: "admin-order-001"
  UserID: "admin-user"        # References user above
  Status: "completed"
```

### Realistic Test Data

```yaml
# Good - Realistic data
- UserID: "customer-001"
  Email: "sarah.wilson@email.com"
  Name: "Sarah Wilson"
  CreatedAt: "2024-01-15T09:30:00Z"

# Avoid - Placeholder data
- UserID: "1"
  Email: "test@test.com"
  Name: "Test User"
  CreatedAt: "2000-01-01T00:00:00Z"
```

## Multi-Database Seeding

### Primary Database

```bash
# Seed primary database
make seed-primary SCENARIO=example-01-basic-setup
```

### Secondary Database

```yaml
# For secondary database, organize fixtures separately
scenarios/example-01-basic-setup/
├── fixtures/              # Primary DB fixtures
│   ├── Users.yml
│   └── Orders.yml
└── fixtures-secondary/     # Secondary DB fixtures
    └── Products.yml
```

```bash
# Seed secondary database
make seed-secondary SCENARIO=example-01-basic-setup
```

## Foreign Key Relationships

### Parent-Child Data

```yaml
# fixtures/Users.yml (load first)
- UserID: "customer-001"
  Email: "customer@example.com"
  Name: "Customer One"

# fixtures/Orders.yml (load after Users)
- OrderID: "order-001"
  UserID: "customer-001"     # References parent
  Total: 1500
  Status: "pending"

- OrderID: "order-002"
  UserID: "customer-001"     # Same parent
  Total: 2500
  Status: "completed"
```

### Loading Order

The seed injector loads fixtures alphabetically by filename:
1. `Orders.yml`
2. `Products.yml`  
3. `Users.yml`

Control loading order with prefixes:
```
fixtures/
├── 01_Users.yml           # Load first
├── 02_Products.yml        # Load second
└── 03_Orders.yml          # Load third
```

## Performance Optimization

### Batch Operations

The Go seed injector automatically batches operations:

```go
// Internal batching (you don't need to configure this)
// - Groups INSERT operations by table
// - Uses Spanner batch APIs
// - Pools connections for reuse
```

### Connection Pooling

```bash
# Environment tuning for large datasets
export SPANNER_MAX_CONNECTIONS=10
export SPANNER_BATCH_SIZE=100
```

## Troubleshooting

### Common Issues

**Foreign key constraint violations:**
```bash
# Check fixture loading order
ls -la scenarios/your-scenario/fixtures/

# Rename files to control order:
# Users.yml -> 01_Users.yml
# Orders.yml -> 02_Orders.yml
```

**Data type mismatches:**
```yaml
# Wrong - Spanner expects STRING for UUIDs
- UserID: 123

# Correct
- UserID: "user-123"
```

**Timestamp format errors:**
```yaml
# Wrong
- CreatedAt: "2024-01-01"

# Correct - Include time and timezone
- CreatedAt: "2024-01-01T00:00:00Z"
```

### Debugging

```bash
# Verbose seeding output
make seed-scenario SCENARIO=example-01-basic-setup VERBOSE=true

# Check seeded data
make validate-primary
```

## Integration with Tests

### Test Flow

1. **Schema applied** - Database structure ready
2. **Fixtures loaded** - Minimal seed data injected
3. **Tests run** - Playwright + SQL validation
4. **State validated** - Expected database state checked

### Validation Integration

```typescript
// In your Playwright tests
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

test('after seeding', async () => {
  // Verify seed data loaded correctly
  const userCount = await validateDatabaseState(`
    SELECT COUNT(*) as count FROM Users
  `);
  expect(userCount[0].count).toBe(2); // Matches fixture count
});
```

## Advanced Patterns

### Conditional Data

```yaml
# fixtures/Users.yml
- UserID: "premium-user"
  Email: "premium@example.com"
  Subscription: "premium"
  Features: ["feature-a", "feature-b", "feature-c"]

- UserID: "basic-user"  
  Email: "basic@example.com"
  Subscription: "basic"
  Features: ["feature-a"]
```

### Time-Based Data

```yaml
# Create realistic time sequences
- OrderID: "order-001"
  CreatedAt: "2024-01-15T09:00:00Z"
  Status: "pending"

- OrderID: "order-002"
  CreatedAt: "2024-01-15T10:30:00Z"  # 1.5 hours later
  Status: "processing"

- OrderID: "order-003"
  CreatedAt: "2024-01-15T14:00:00Z"  # Same day, afternoon
  Status: "completed"
```

See [Writing Tests](./writing-tests) for how fixtures integrate with your test scenarios.