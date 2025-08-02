# Multi-Database Examples

Practical examples for testing applications with multiple Cloud Spanner databases using Spanwright.

## E-Commerce Microservices

### Architecture Overview

This example demonstrates testing an e-commerce system with separated databases:

- **User Service Database**: User accounts, authentication, profiles
- **Product Service Database**: Products, categories, inventory

### Project Setup

```bash
# Generate multi-database project
npx spanwright

# Configuration choices:
# Project name: ecommerce-e2e
# Database count: 2
# Primary DB: user-service-db
# Secondary DB: product-service-db
```

### Database Schemas

**User Service Schema:**
```sql
-- schemas/user-service/001_initial_schema.sql
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Email STRING(255) NOT NULL,
  Name STRING(100) NOT NULL,
  Status STRING(20) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID);

CREATE UNIQUE INDEX UsersByEmail ON Users (Email);

-- schemas/user-service/002_add_user_profiles.sql
CREATE TABLE UserProfiles (
  UserID STRING(36) NOT NULL,
  FirstName STRING(50),
  LastName STRING(50),
  Phone STRING(20),
  DateOfBirth DATE,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID),
INTERLEAVE IN PARENT Users ON DELETE CASCADE;
```

**Product Service Schema:**
```sql
-- schemas/product-service/001_initial_schema.sql
CREATE TABLE Categories (
  CategoryID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Description STRING(500),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (CategoryID);

-- schemas/product-service/002_add_products.sql
CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(200) NOT NULL,
  Description STRING(1000),
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  InventoryCount INT64 NOT NULL DEFAULT (0),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (ProductID);

CREATE INDEX ProductsByCategory ON Products (CategoryID);
```

### Test Scenario: Complete User Journey

```
scenarios/example-03-user-product-journey/
├── fixtures/
│   ├── primary/              # User service data
│   │   ├── Users.yml
│   │   └── UserProfiles.yml
│   └── secondary/            # Product service data
│       ├── Categories.yml
│       └── Products.yml
├── expected-primary.yaml
├── expected-secondary.yaml
└── tests/
    └── user-journey.spec.ts
```

### Fixture Data

**User Service Fixtures:**
```yaml
# fixtures/primary/Users.yml
- UserID: "user-001"
  Email: "john.doe@example.com"
  Name: "John Doe"
  Status: "active"
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"

- UserID: "user-002"
  Email: "jane.smith@example.com"
  Name: "Jane Smith"
  Status: "active"
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"
```

```yaml
# fixtures/primary/UserProfiles.yml
- UserID: "user-001"
  FirstName: "John"
  LastName: "Doe"
  Phone: "+1-555-0101"
  DateOfBirth: "1990-01-01"
  CreatedAt: "2024-01-01T00:00:00Z"
```

**Product Service Fixtures:**
```yaml
# fixtures/secondary/Categories.yml
- CategoryID: "cat-001"
  Name: "Electronics"
  Description: "Electronic devices and accessories"
  CreatedAt: "2024-01-01T00:00:00Z"

- CategoryID: "cat-002"
  Name: "Books"
  Description: "Physical and digital books"
  CreatedAt: "2024-01-01T00:00:00Z"
```

```yaml
# fixtures/secondary/Products.yml
- ProductID: "prod-001"
  Name: "Smartphone Pro"
  Description: "Latest smartphone with advanced features"
  Price: 99900  # $999.00 in cents
  CategoryID: "cat-001"
  InventoryCount: 50
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"

- ProductID: "prod-002"
  Name: "Programming Guide"
  Description: "Comprehensive programming tutorial"
  Price: 4999   # $49.99 in cents
  CategoryID: "cat-002"
  InventoryCount: 100
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"
```

### End-to-End Test Implementation

```typescript
// tests/user-journey.spec.ts
import { test, expect } from '@playwright/test';
import { 
  validateDatabaseState,
  validateSecondaryDatabase 
} from '../../../tests/utils/sql-validator';

test.describe('E-Commerce User Journey', () => {
  test('complete purchase flow across services', async ({ page }) => {
    // 1. User Registration (Primary Database)
    await page.goto('/register');
    await page.fill('[data-testid="email"]', 'newuser@example.com');
    await page.fill('[data-testid="password"]', 'securepassword123');
    await page.fill('[data-testid="confirm-password"]', 'securepassword123');
    await page.click('[data-testid="register-button"]');
    
    // Verify registration success
    await expect(page.locator('.registration-success')).toBeVisible();
    
    // Validate user created in primary database
    const newUser = await validateDatabaseState(`
      SELECT UserID, Email, Status
      FROM Users
      WHERE Email = 'newuser@example.com'
    `);
    expect(newUser).toHaveLength(1);
    expect(newUser[0].Status).toBe('active');
    
    // 2. Browse Products (Secondary Database)
    await page.goto('/products');
    
    // Verify products are displayed
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-prod-001"]')).toBeVisible();
    
    // Validate products in secondary database
    const availableProducts = await validateSecondaryDatabase(`
      SELECT p.ProductID, p.Name, p.InventoryCount, c.Name as CategoryName
      FROM Products p
      JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.InventoryCount > 0
    `);
    expect(availableProducts).toHaveLength(2);
    expect(availableProducts[0].InventoryCount).toBeGreaterThan(0);
    
    // 3. Add Product to Cart
    await page.click('[data-testid="product-prod-001"]');
    await expect(page.locator('.product-details')).toBeVisible();
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.locator('.cart-notification')).toBeVisible();
    
    // 4. Login with Existing User
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'john.doe@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Verify login success
    await expect(page.locator('.user-menu')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toHaveText('John Doe');
    
    // 5. Complete Purchase
    await page.goto('/cart');
    await expect(page.locator('.cart-item')).toBeVisible();
    await page.click('[data-testid="checkout-button"]');
    
    // Fill shipping information
    await page.fill('[data-testid="shipping-address"]', '123 Main St');
    await page.fill('[data-testid="shipping-city"]', 'Anytown');
    await page.fill('[data-testid="shipping-zip"]', '12345');
    
    // Complete order
    await page.click('[data-testid="place-order-button"]');
    await expect(page.locator('.order-confirmation')).toBeVisible();
    
    // 6. Validate Cross-Database State
    
    // Check order created (assuming orders stored in primary DB)
    const orderData = await validateDatabaseState(`
      SELECT COUNT(*) as orderCount
      FROM Orders o
      JOIN Users u ON o.UserID = u.UserID
      WHERE u.Email = 'john.doe@example.com'
        AND o.Status = 'confirmed'
    `);
    expect(orderData[0].orderCount).toBe(1);
    
    // Check inventory decremented in secondary database
    const updatedInventory = await validateSecondaryDatabase(`
      SELECT InventoryCount
      FROM Products
      WHERE ProductID = 'prod-001'
    `);
    expect(updatedInventory[0].InventoryCount).toBe(49); // Decremented from 50
  });
  
  test('user profile management across services', async ({ page }) => {
    // Login as existing user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'jane.smith@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to profile
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-link"]');
    
    // Update profile information
    await page.fill('[data-testid="first-name"]', 'Jane');
    await page.fill('[data-testid="last-name"]', 'Smith-Johnson');
    await page.fill('[data-testid="phone"]', '+1-555-0202');
    await page.click('[data-testid="save-profile"]');
    
    // Verify success message
    await expect(page.locator('.profile-saved')).toBeVisible();
    
    // Validate profile update in primary database
    const profileData = await validateDatabaseState(`
      SELECT up.FirstName, up.LastName, up.Phone
      FROM UserProfiles up
      JOIN Users u ON up.UserID = u.UserID
      WHERE u.Email = 'jane.smith@example.com'
    `);
    expect(profileData[0].LastName).toBe('Smith-Johnson');
    expect(profileData[0].Phone).toBe('+1-555-0202');
    
    // View purchase history (cross-database query simulation)
    await page.click('[data-testid="order-history"]');
    await expect(page.locator('.order-history')).toBeVisible();
    
    // This would validate that the UI correctly displays
    // data from both user service and product service
  });
});
```

### Expected State Validation

```yaml
# expected-primary.yaml
tables:
  Users:
    count: 3  # 2 existing + 1 new registration
    conditions:
      - column: "Status"
        value: "active"
        count: 3
      - column: "Email"
        pattern: "@example.com$"
        count: 3
        
  UserProfiles:
    count: 2  # 1 existing + 1 updated
    conditions:
      - column: "Phone"
        pattern: "^\\+1-555-"
        count: 2
        
  Orders:
    count: 1
    conditions:
      - column: "Status"
        value: "confirmed"
        count: 1
```

```yaml
# expected-secondary.yaml
tables:
  Categories:
    count: 2
    conditions:
      - column: "Name"
        value: "Electronics"
        count: 1
      - column: "Name"
        value: "Books"
        count: 1
        
  Products:
    count: 2
    conditions:
      - column: "InventoryCount"
        operator: ">"
        value: 0
        count: 2
      # Specific inventory check for purchased item
      - column: "ProductID"
        value: "prod-001"
        extra_conditions:
          - column: "InventoryCount"
            value: 49
        count: 1
```

## Financial Services Example

### Architecture

- **Account Service Database**: User accounts, balances, transactions
- **Risk Service Database**: Risk profiles, compliance data

### Schema Design

```sql
-- Account Service
CREATE TABLE Accounts (
  AccountID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  AccountType STRING(20) NOT NULL,
  Balance NUMERIC NOT NULL,
  Currency STRING(3) NOT NULL DEFAULT ('USD'),
  Status STRING(20) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (AccountID);

CREATE TABLE Transactions (
  TransactionID STRING(36) NOT NULL,
  FromAccountID STRING(36),
  ToAccountID STRING(36),
  Amount NUMERIC NOT NULL,
  Currency STRING(3) NOT NULL,
  Status STRING(20) NOT NULL,
  Description STRING(500),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TransactionID);
```

```sql
-- Risk Service
CREATE TABLE RiskProfiles (
  UserID STRING(36) NOT NULL,
  RiskScore INT64 NOT NULL,
  LastAssessment TIMESTAMP NOT NULL,
  ComplianceStatus STRING(20) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID);

CREATE TABLE ComplianceChecks (
  CheckID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  CheckType STRING(50) NOT NULL,
  Result STRING(20) NOT NULL,
  Details JSON,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (CheckID);
```

### Test Scenario: Money Transfer with Compliance

```typescript
test('money transfer with risk assessment', async ({ page }) => {
  // Login as high-value customer
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'premium@example.com');
  await page.click('[data-testid="login"]');
  
  // Initiate large transfer
  await page.goto('/transfer');
  await page.fill('[data-testid="to-account"]', 'ACC-789');
  await page.fill('[data-testid="amount"]', '50000');
  await page.click('[data-testid="transfer-button"]');
  
  // Verify compliance check triggered
  await expect(page.locator('.compliance-verification')).toBeVisible();
  await page.click('[data-testid="confirm-transfer"]');
  
  // Validate account balance updated
  const balanceData = await validateDatabaseState(`
    SELECT Balance
    FROM Accounts
    WHERE AccountID = 'ACC-123'
  `);
  expect(Number(balanceData[0].Balance)).toBe(50000); // Decreased by transfer
  
  // Validate risk profile updated in secondary database
  const riskData = await validateSecondaryDatabase(`
    SELECT RiskScore, ComplianceStatus
    FROM RiskProfiles
    WHERE UserID = 'user-premium'
  `);
  expect(riskData[0].ComplianceStatus).toBe('verified');
  
  // Validate compliance check recorded
  const complianceData = await validateSecondaryDatabase(`
    SELECT CheckType, Result
    FROM ComplianceChecks
    WHERE UserID = 'user-premium'
      AND CheckType = 'large_transfer'
    ORDER BY CreatedAt DESC
    LIMIT 1
  `);
  expect(complianceData[0].Result).toBe('passed');
});
```

## IoT Platform Example

### Architecture

- **Device Service Database**: Device registry, metadata, status
- **Telemetry Service Database**: Sensor data, metrics, alerts

### Test Scenario: Device Data Pipeline

```typescript
test('IoT device data flow', async ({ page }) => {
  // Register new device
  await page.goto('/devices/register');
  await page.fill('[data-testid="device-id"]', 'SENSOR-001');
  await page.fill('[data-testid="device-type"]', 'temperature');
  await page.click('[data-testid="register-device"]');
  
  // Verify device registered
  const deviceData = await validateDatabaseState(`
    SELECT DeviceID, Status, DeviceType
    FROM Devices
    WHERE DeviceID = 'SENSOR-001'
  `);
  expect(deviceData[0].Status).toBe('active');
  
  // Simulate telemetry data ingestion
  await page.goto('/devices/SENSOR-001/simulate');
  await page.fill('[data-testid="temperature"]', '23.5');
  await page.click('[data-testid="send-data"]');
  
  // Validate telemetry stored in secondary database
  const telemetryData = await validateSecondaryDatabase(`
    SELECT DeviceID, Temperature, Timestamp
    FROM TelemetryData
    WHERE DeviceID = 'SENSOR-001'
    ORDER BY Timestamp DESC
    LIMIT 1
  `);
  expect(Number(telemetryData[0].Temperature)).toBe(23.5);
});
```

## Running Multi-Database Examples

### Local Development

```bash
# Setup both databases
make start
make apply-schemas

# Run specific example
make run-scenario SCENARIO=example-03-user-product-journey

# Run all multi-database scenarios
make run-all-scenarios | grep -E "(example-03|example-04|example-05)"
```

### CI/CD Integration

```bash
# Validate both database configurations
make validate-primary
make validate-secondary

# Generate combined test report
make generate-multi-db-report
```

## Best Practices

### Data Consistency

1. **Eventual consistency** - Use proper waits for cross-service operations
2. **Transaction boundaries** - Understand service boundaries
3. **Compensation patterns** - Test rollback scenarios
4. **Idempotency** - Ensure operations can be safely retried

### Test Organization

1. **Service-specific tests** - Test each service independently
2. **Integration tests** - Test cross-service workflows
3. **Data isolation** - Use unique identifiers per test run
4. **Resource cleanup** - Clean up test data across all databases

### Performance

1. **Connection pooling** - Reuse database connections
2. **Parallel validation** - Validate databases concurrently
3. **Minimal fixtures** - Use only necessary test data
4. **Batch operations** - Group related database operations

See [Multi-Database Setup](../guide/multi-database) for detailed configuration and [Validation](../guide/validation) for advanced validation patterns.