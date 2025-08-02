# Database Validation

Comprehensive guide to validating database state in Spanwright E2E tests using spalidate and inline SQL validation.

## Overview

Spanwright provides two complementary validation approaches:

1. **Inline SQL Validation** - Direct SQL queries within Playwright tests
2. **Declarative YAML Validation** - Automated validation using spalidate

Both approaches ensure your database state matches expectations after E2E test execution.

## Inline SQL Validation

### Basic Usage

Use the `validateDatabaseState` utility for direct SQL validation within your Playwright tests:

```typescript
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

test('should create user correctly', async ({ page }) => {
  // Perform browser actions
  await page.goto('/register');
  await page.fill('[data-testid="email"]', 'new@example.com');
  await page.click('[data-testid="submit"]');
  
  // Validate database state
  const userExists = await validateDatabaseState(`
    SELECT COUNT(*) as count 
    FROM Users 
    WHERE Email = 'new@example.com'
  `);
  expect(userExists[0].count).toBe(1);
});
```

### Advanced SQL Validation

```typescript
// Complex state validation
const orderData = await validateDatabaseState(`
  SELECT o.OrderID, o.Status, u.Email
  FROM Orders o
  JOIN Users u ON o.UserID = u.UserID
  WHERE o.CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
`);

expect(orderData).toHaveLength(2);
expect(orderData[0].Status).toBe('pending');
expect(orderData[1].Email).toBe('test@example.com');
```

### Multi-Database Validation

For projects with multiple databases:

```typescript
import { 
  validateDatabaseState,      // Primary database
  validateSecondaryDatabase   // Secondary database
} from '../../../tests/utils/sql-validator';

// Validate primary database
const userCount = await validateDatabaseState(`
  SELECT COUNT(*) as count FROM Users
`);

// Validate secondary database
const productCount = await validateSecondaryDatabase(`
  SELECT COUNT(*) as count FROM Products
`);
```

## Declarative YAML Validation

### Expected State Files

Create `expected-*.yaml` files to define expected database state:

```yaml
# expected-primary.yaml
tables:
  Users:
    count: 3
    conditions:
      - column: "Status"
        value: "active"
        count: 3
      - column: "Email"
        pattern: "@example.com$"
        count: 3
        
  Orders:
    count: 2
    conditions:
      - column: "Status"
        value: "pending"
        count: 1
      - column: "Status"
        value: "completed"
        count: 1
```

### Advanced Validation Conditions

```yaml
# expected-secondary.yaml
tables:
  Products:
    count: 5
    conditions:
      # Exact value matching
      - column: "Category"
        value: "electronics"
        count: 2
        
      # Numeric comparisons
      - column: "Price"
        operator: ">"
        value: 100
        count: 3
        
      # Pattern matching
      - column: "SKU"
        pattern: "^PROD-[0-9]{4}$"
        count: 5
        
      # Date range validation
      - column: "CreatedAt"
        operator: ">="
        value: "2024-01-01T00:00:00Z"
        count: 5
```

### Running YAML Validation

```bash
# Validate primary database
make validate-primary

# Validate secondary database (if applicable)
make validate-secondary

# Validate all databases
make validate-all

# Run specific scenario with validation
make run-scenario SCENARIO=example-01-basic-setup
```

## Spalidate Integration

### Tool Overview

Spanwright uses [spalidate](https://github.com/nu0ma/spalidate) for automated database validation:

- **Declarative**: Define expected state in YAML
- **Comprehensive**: Supports complex conditions and patterns
- **Cloud Spanner Native**: Optimized for Spanner data types
- **CI/CD Ready**: Machine-readable output for automation

### Configuration

Spalidate is automatically configured in generated projects:

```bash
# Makefile integration
validate-primary:
	spalidate validate \
		--database-id=$(PRIMARY_DB_NAME) \
		--instance-id=$(SPANNER_INSTANCE_ID) \
		--project-id=$(SPANNER_PROJECT_ID) \
		--expected-file=expected-primary.yaml

validate-secondary:
	spalidate validate \
		--database-id=$(SECONDARY_DB_NAME) \
		--instance-id=$(SPANNER_INSTANCE_ID) \
		--project-id=$(SPANNER_PROJECT_ID) \
		--expected-file=expected-secondary.yaml
```

### Validation Output

Successful validation:
```
✅ Database validation completed for scenario-01-user-registration
✅ Table Users: Expected 3 records, found 3
✅ Table Orders: Expected 2 records, found 2
✅ All conditions satisfied
```

Failed validation:
```
❌ Database validation failed for scenario-01
❌ Table Users: Expected 3 records, found 2
❌ Condition failed: Status='active' expected 3, found 2
```

## Validation Patterns

### Test-Driven Validation

1. **Write test first** with expected database state
2. **Run test** to see current behavior
3. **Implement feature** to pass validation
4. **Verify** both UI and database state

```typescript
test('user deletion should update status', async ({ page }) => {
  // Arrange: User exists with active status
  await validateDatabaseState(`
    SELECT Status FROM Users WHERE UserID = 'user-001'
  `).then(result => expect(result[0].Status).toBe('active'));
  
  // Act: Delete user via UI
  await page.goto('/users/user-001');
  await page.click('[data-testid="delete-button"]');
  await page.click('[data-testid="confirm-delete"]');
  
  // Assert: Status changed to deleted
  await validateDatabaseState(`
    SELECT Status FROM Users WHERE UserID = 'user-001'
  `).then(result => expect(result[0].Status).toBe('deleted'));
});
```

### Eventual Consistency

For operations that may take time:

```typescript
import { expect } from '@playwright/test';

// Use Playwright's polling for eventual consistency
await expect.poll(async () => {
  const result = await validateDatabaseState(`
    SELECT Status FROM Orders WHERE OrderID = 'order-001'
  `);
  return result[0].Status;
}, {
  message: 'Order status should eventually become processed',
  timeout: 10000,
  intervals: [1000, 2000]
}).toBe('processed');
```

### Batch Validation

For performance-critical tests:

```typescript
// Validate multiple conditions in single query
const validationResult = await validateDatabaseState(`
  SELECT 
    (SELECT COUNT(*) FROM Users WHERE Status = 'active') as active_users,
    (SELECT COUNT(*) FROM Orders WHERE Status = 'pending') as pending_orders,
    (SELECT COUNT(*) FROM Products WHERE Price > 100) as expensive_products
`);

expect(validationResult[0].active_users).toBe(3);
expect(validationResult[0].pending_orders).toBe(2);
expect(validationResult[0].expensive_products).toBe(5);
```

## Troubleshooting Validation

### Common Issues

**Database connection timeouts:**
```bash
# Restart emulator
make stop
make start

# Check emulator status
docker ps | grep spanner-emulator
```

**Validation timing issues:**
- Add proper waits before validation
- Use `expect.poll()` for eventual consistency
- Increase timeout values for slow operations

**Data type mismatches:**
```typescript
// Ensure proper type conversion
const result = await validateDatabaseState(`
  SELECT CAST(Price AS STRING) as price_str FROM Products
`);
expect(result[0].price_str).toBe('99.99');
```

### Debugging Validation

**Enable debug output:**
```bash
# Spalidate debug mode
DEBUG=spalidate make validate-primary

# SQL query debugging
DEBUG=sql-validator npm test
```

**Inspect actual vs expected:**
```typescript
// Log actual data for debugging
const actualData = await validateDatabaseState(`
  SELECT * FROM Users ORDER BY CreatedAt DESC LIMIT 5
`);
console.log('Actual data:', JSON.stringify(actualData, null, 2));
```

## Best Practices

### Validation Strategy

1. **Test boundaries** - Validate edge cases and limits
2. **Use specific queries** - Avoid `SELECT *` in production tests
3. **Validate relationships** - Check foreign key consistency
4. **Test data integrity** - Ensure constraints are enforced

### Performance

1. **Minimize queries** - Batch validation when possible
2. **Use indexes** - Ensure validation queries are optimized
3. **Limit result sets** - Use LIMIT for large table validation
4. **Cache connections** - Reuse database connections

### Maintainability

1. **Descriptive assertions** - Clear error messages
2. **Reusable validators** - Create custom validation functions
3. **Version expected files** - Track validation evolution
4. **Document assumptions** - Comment complex validation logic

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Run E2E tests with validation
  run: |
    make run-all-scenarios
    
- name: Upload validation reports
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: validation-reports
    path: reports/validation-*.json
```

### Makefile Integration

```makefile
run-scenario:
	@echo "🚀 Running scenario: $(SCENARIO)"
	cd scenarios/$(SCENARIO) && make seed-and-test
	@echo "✅ Database validation completed for $(SCENARIO)"

run-all-scenarios:
	@for scenario in scenarios/*/; do \
		make run-scenario SCENARIO=$$(basename $$scenario); \
	done
```

See [Writing Tests](./writing-tests) for more details on test implementation and [Database Seeding](./database-seeding) for seed data management.