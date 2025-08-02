# Database Validation

Comprehensive guide to validating database state in Spanwright E2E tests using spalidate and inline SQL validation.

## Overview

Spanwright provides two complementary validation approaches:

**Declarative YAML Validation** - Automated validation using spalidate (recommended)

Both approaches ensure your database state matches expectations after E2E test execution.

## YAML-Based Validation

### Basic Usage

Use the `validateDatabaseState` utility for automated YAML-based validation:

```typescript
import { validateDatabaseState } from '../../../tests/test-utils';

test('Database Validation', async () => {
  // Validate primary database using expected YAML file
  const validation1 = validateDatabaseState('example-01-basic-setup', 'primary');
  expect(validation1).toBe(true);
  
  // Validate secondary database (if using multi-database setup)
  const validation2 = validateDatabaseState('example-01-basic-setup', 'secondary');
  expect(validation2).toBe(true);
});
```

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
