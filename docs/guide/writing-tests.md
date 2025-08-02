# Writing Tests

## Overview

Spanwright combines Playwright for browser automation with direct SQL validation for comprehensive E2E testing. Each test scenario includes minimal seed data and inline database validation.

## Test Scenario Structure

```
scenarios/example-01-basic-setup/
├── fixtures/                  # YAML seed data
│   ├── Users.yml
│   └── Products.yml
├── expected-primary.yaml      # Expected database state
└── tests/                     # Playwright E2E tests
    └── basic.spec.ts
```

## Writing Playwright Tests

### Basic Test Structure

```typescript
// tests/basic.spec.ts
import { test, expect } from '@playwright/test';
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

test.describe('User Registration Flow', () => {
  test('should create user and validate database', async ({ page }) => {
    // Browser automation
    await page.goto('/register');
    await page.fill('[data-testid="email"]', 'new@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="submit"]');
    
    // Verify UI response
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Validate database state
    const userExists = await validateDatabaseState(`
      SELECT COUNT(*) as count 
      FROM Users 
      WHERE Email = 'new@example.com'
    `);
    expect(userExists[0].count).toBe(1);
  });
});
```

### SQL Validation Utility

```typescript
// tests/utils/sql-validator.ts usage
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

// Simple count validation
const result = await validateDatabaseState(`
  SELECT COUNT(*) as count FROM Users WHERE Status = 'active'
`);
expect(result[0].count).toBe(3);

// Complex state validation
const orderData = await validateDatabaseState(`
  SELECT o.OrderID, o.Status, u.Email
  FROM Orders o
  JOIN Users u ON o.UserID = u.UserID
  WHERE o.CreatedAt >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
`);
expect(orderData).toHaveLength(2);
expect(orderData[0].Status).toBe('pending');
```

## Seed Data with YAML Fixtures

### Creating Fixtures

```yaml
# fixtures/Users.yml
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

```yaml
# fixtures/Products.yml
- ProductID: "prod-001"
  Name: "Test Product"
  Price: 1000
  CreatedAt: "2024-01-01T00:00:00Z"
```

### Fixture Best Practices

1. **Minimal data** - Only essential records for the test
2. **Realistic IDs** - Use descriptive, consistent IDs
3. **Proper types** - Match Spanner column types exactly
4. **Timestamps** - Use ISO 8601 format

## Database State Validation

### Expected State Files

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
        
  Products:
    count: 1
    conditions:
      - column: "Price"
        operator: ">"
        value: 0
        count: 1
```

### Spalidate Integration

Spanwright uses [spalidate](https://github.com/nu0ma/spalidate) for automated database validation:

```bash
# Validate current database state
make validate-primary

# Validate all databases
make validate-all
```

## Test Configuration

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './scenarios',
  globalSetup: require.resolve('./tests/global-setup'),
  workers: 1, // Single worker for database isolation
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Global Setup

```typescript
// tests/global-setup.ts
async function globalSetup() {
  // Start Spanner emulator if not running
  // Apply schemas
  // Basic health checks
  console.log('E2E environment ready');
}

export default globalSetup;
```

## Multi-Database Testing

### Configuration

```typescript
// For secondary database validation
import { validateSecondaryDatabase } from '../../../tests/utils/sql-validator';

const productCount = await validateSecondaryDatabase(`
  SELECT COUNT(*) as count FROM Products
`);
```

### Environment Variables

```bash
# .env
PRIMARY_DB_NAME=user-service-db
SECONDARY_DB_NAME=product-service-db
```

## Running Tests

### Single Scenario

```bash
# Run specific scenario
make run-scenario SCENARIO=example-01-basic-setup
```

### All Scenarios

```bash
# Full test suite
make run-all-scenarios
```

### Development Mode

```bash
# Start emulator and keep running
make start

# Run tests with UI (in another terminal)
cd scenarios/example-01-basic-setup
npx playwright test --ui
```

## Advanced Patterns

### Page Object Model

```typescript
// tests/pages/UserPage.ts
export class UserPage {
  constructor(private page: Page) {}

  async registerUser(email: string, password: string) {
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="submit"]');
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('.success')).toBeVisible();
  }
}
```

### Custom Assertions

```typescript
// tests/utils/custom-matchers.ts
export async function expectUserCount(expectedCount: number) {
  const result = await validateDatabaseState(`
    SELECT COUNT(*) as count FROM Users
  `);
  expect(result[0].count).toBe(expectedCount);
}
```

## Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Restart emulator
make stop
make start
```

**Test data conflicts:**
- Use unique IDs in fixtures
- Clear state between scenarios

**Timing issues:**
- Add proper waits: `await page.waitForSelector()`
- Use `expect.poll()` for eventual consistency

### Debugging

```bash
# Run with debug output
DEBUG=pw:api npx playwright test

# Generate test report
npx playwright show-report
```

## Best Practices

1. **Minimal fixtures** - Only data needed for the specific test
2. **Clear test names** - Describe the exact behavior being tested
3. **Independent scenarios** - Each scenario should work in isolation
4. **Database validation** - Always verify expected database changes
5. **Realistic data** - Use representative test data
6. **Clean assertions** - One concept per assertion

See [Database Seeding](./database-seeding) for more details on managing test data.