# Step-by-Step Tutorials

Comprehensive tutorials for mastering Spanwright E2E testing with real-world examples.

## Tutorial 1: Building an E-Commerce Testing Suite

Learn to create comprehensive tests for an e-commerce application with user management, product catalog, and order processing.

### What You'll Build

- **User authentication** with registration and login flows
- **Product catalog** with search and filtering
- **Shopping cart** with add/remove functionality
- **Order processing** with payment simulation
- **Admin dashboard** for managing products and orders

### Prerequisites

- Completed [Quick Start Guide](../guide/quick-start)
- Familiarity with Playwright testing
- Basic understanding of Cloud Spanner

### Step 1: Project Setup

Create a new project with dual database configuration:

```bash
# Set up environment for dual databases
export SPANWRIGHT_DB_COUNT=2
export SPANWRIGHT_PRIMARY_DB_NAME=user-service-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schemas/users
export SPANWRIGHT_SECONDARY_DB_NAME=product-service-db
export SPANWRIGHT_SECONDARY_SCHEMA_PATH=./schemas/products

# Create project
npx spanwright ecommerce-tests --non-interactive
cd ecommerce-tests
```

### Step 2: Design Database Schemas

Create schemas for both databases:

**User Service Schema** (`schemas/users/001_users.sql`):
```sql
-- User management tables
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Email STRING(255) NOT NULL,
  PasswordHash STRING(255) NOT NULL,
  FirstName STRING(100),
  LastName STRING(100),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID);

CREATE UNIQUE INDEX UsersByEmail ON Users(Email);

CREATE TABLE UserSessions (
  SessionID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  ExpiresAt TIMESTAMP NOT NULL,
  IsActive BOOL NOT NULL DEFAULT (true),
) PRIMARY KEY (SessionID),
  INTERLEAVE IN PARENT Users ON DELETE CASCADE;

CREATE TABLE UserProfiles (
  UserID STRING(36) NOT NULL,
  DateOfBirth DATE,
  PhoneNumber STRING(20),
  Address JSON,
  Preferences JSON,
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID),
  INTERLEAVE IN PARENT Users ON DELETE CASCADE;
```

**Product Service Schema** (`schemas/products/001_products.sql`):
```sql
-- Product catalog tables  
CREATE TABLE Categories (
  CategoryID STRING(36) NOT NULL,
  Name STRING(100) NOT NULL,
  Description STRING(500),
  ParentCategoryID STRING(36),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (CategoryID);

CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  CategoryID STRING(36) NOT NULL,
  Name STRING(200) NOT NULL,
  Description STRING(2000),
  Price NUMERIC NOT NULL,
  Currency STRING(3) NOT NULL DEFAULT ("USD"),
  StockQuantity INT64 NOT NULL DEFAULT (0),
  IsActive BOOL NOT NULL DEFAULT (true),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (ProductID);

CREATE TABLE ProductImages (
  ProductID STRING(36) NOT NULL,
  ImageID STRING(36) NOT NULL,
  ImageURL STRING(500) NOT NULL,
  AltText STRING(200),
  SortOrder INT64 NOT NULL DEFAULT (0),
) PRIMARY KEY (ProductID, ImageID),
  INTERLEAVE IN PARENT Products ON DELETE CASCADE;

CREATE TABLE ShoppingCarts (
  CartID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  UpdatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (CartID);

CREATE TABLE CartItems (
  CartID STRING(36) NOT NULL,
  ProductID STRING(36) NOT NULL,
  Quantity INT64 NOT NULL,
  AddedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (CartID, ProductID),
  INTERLEAVE IN PARENT ShoppingCarts ON DELETE CASCADE;
```

### Step 3: Create Test Scenarios

#### Scenario 1: User Registration Flow

Create directory structure:
```bash
mkdir -p scenarios/scenario-01-user-registration/{fixtures/user-service-db,fixtures/product-service-db,tests}
```

**Seed Data** (`scenarios/scenario-01-user-registration/fixtures/product-service-db/Categories.yml`):
```yaml
- CategoryID: "cat-electronics"
  Name: "Electronics"
  Description: "Electronic devices and accessories"
  CreatedAt: "2024-01-01T00:00:00Z"

- CategoryID: "cat-smartphones" 
  Name: "Smartphones"
  Description: "Mobile phones and accessories"
  ParentCategoryID: "cat-electronics"
  CreatedAt: "2024-01-01T00:00:00Z"
```

**Test** (`scenarios/scenario-01-user-registration/tests/user-registration.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

test.describe('User Registration Flow', () => {
  test('should register new user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.fill('#firstName', 'John');
    await page.fill('#lastName', 'Doe'); 
    await page.fill('#email', 'john.doe@example.com');
    await page.fill('#password', 'SecurePassword123!');
    await page.fill('#confirmPassword', 'SecurePassword123!');

    // Submit form
    await page.click('#registerButton');

    // Verify success message
    await expect(page.locator('#successMessage')).toBeVisible();
    await expect(page.locator('#successMessage')).toContainText('Registration successful');

    // Verify user is redirected to login
    await expect(page).toHaveURL('/login');

    // Validate database state
    const userCount = await validateDatabaseState(
      'user-service-db',
      'SELECT COUNT(*) as count FROM Users WHERE Email = "john.doe@example.com"'
    );
    expect(userCount[0].count).toBe(1);
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    // First registration
    await page.goto('/register');
    await page.fill('#firstName', 'Jane');
    await page.fill('#lastName', 'Smith');
    await page.fill('#email', 'duplicate@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirmPassword', 'Password123!');
    await page.click('#registerButton');

    await expect(page.locator('#successMessage')).toBeVisible();

    // Attempt duplicate registration
    await page.goto('/register');
    await page.fill('#firstName', 'Another');
    await page.fill('#lastName', 'User');
    await page.fill('#email', 'duplicate@example.com');
    await page.fill('#password', 'DifferentPass123!');
    await page.fill('#confirmPassword', 'DifferentPass123!');
    await page.click('#registerButton');

    // Verify error message
    await expect(page.locator('#errorMessage')).toBeVisible();
    await expect(page.locator('#errorMessage')).toContainText('Email already exists');

    // Verify only one user exists
    const userCount = await validateDatabaseState(
      'user-service-db', 
      'SELECT COUNT(*) as count FROM Users WHERE Email = "duplicate@example.com"'
    );
    expect(userCount[0].count).toBe(1);
  });
});
```

**Expected State** (`scenarios/scenario-01-user-registration/expected-user-service.yaml`):
```yaml
tables:
  Users:
    row_count_min: 1
    row_count_max: 2
    columns:
      - name: UserID
        type: STRING
        not_null: true
      - name: Email
        type: STRING
        not_null: true
        unique: true
      - name: FirstName
        type: STRING
      - name: LastName
        type: STRING
    constraints:
      - type: unique
        columns: [Email]

  UserSessions:
    row_count: 0  # No sessions created during registration

  UserProfiles:
    row_count: 0  # Profiles created separately
```

#### Scenario 2: Product Search and Cart

**Seed Data** (`scenarios/scenario-02-product-search/fixtures/product-service-db/Products.yml`):
```yaml
- ProductID: "prod-iphone-15"
  CategoryID: "cat-smartphones"
  Name: "iPhone 15 Pro"
  Description: "Latest iPhone with A17 Pro chip"
  Price: 999.99
  Currency: "USD"
  StockQuantity: 50
  IsActive: true
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"

- ProductID: "prod-samsung-s24"
  CategoryID: "cat-smartphones"
  Name: "Samsung Galaxy S24"
  Description: "Premium Android smartphone"
  Price: 899.99
  Currency: "USD"
  StockQuantity: 30
  IsActive: true
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"

- ProductID: "prod-pixel-8"
  CategoryID: "cat-smartphones"
  Name: "Google Pixel 8"
  Description: "Google's flagship phone with AI features"
  Price: 699.99
  Currency: "USD"
  StockQuantity: 25
  IsActive: true
  CreatedAt: "2024-01-01T00:00:00Z"
  UpdatedAt: "2024-01-01T00:00:00Z"
```

**Test** (`scenarios/scenario-02-product-search/tests/product-search.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import { validateDatabaseState } from '../../../tests/utils/sql-validator';

test.describe('Product Search and Cart', () => {
  test('should search products and add to cart', async ({ page }) => {
    // Create user session first (authentication)
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'TestPassword123!');
    await page.click('#loginButton');

    // Navigate to product search
    await page.goto('/products');

    // Search for smartphones
    await page.fill('#searchInput', 'iPhone');
    await page.click('#searchButton');

    // Verify search results
    await expect(page.locator('.product-card')).toHaveCount(1);
    await expect(page.locator('.product-card')).toContainText('iPhone 15 Pro');

    // Add product to cart
    await page.click('.product-card .add-to-cart-button');

    // Verify cart notification
    await expect(page.locator('#cartNotification')).toBeVisible();
    await expect(page.locator('#cartNotification')).toContainText('Added to cart');

    // Verify cart badge updates
    await expect(page.locator('#cartBadge')).toContainText('1');

    // Validate database state - cart should contain the product
    const cartItems = await validateDatabaseState(
      'product-service-db',
      `SELECT ci.ProductID, ci.Quantity, p.Name 
       FROM CartItems ci 
       JOIN Products p ON ci.ProductID = p.ProductID
       WHERE ci.ProductID = "prod-iphone-15"`
    );
    
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].Quantity).toBe(1);
    expect(cartItems[0].Name).toBe('iPhone 15 Pro');
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/products');

    // Click on smartphones category filter
    await page.click('#category-smartphones');

    // Verify filtered results
    await expect(page.locator('.product-card')).toHaveCount(3);
    
    const productNames = await page.locator('.product-card .product-name').allTextContents();
    expect(productNames).toContain('iPhone 15 Pro');
    expect(productNames).toContain('Samsung Galaxy S24');
    expect(productNames).toContain('Google Pixel 8');

    // Verify URL contains filter parameter
    await expect(page).toHaveURL(/category=cat-smartphones/);
  });

  test('should handle out of stock products', async ({ page }) => {
    // First, update a product to be out of stock (in real app, this might be an admin action)
    await page.goto('/admin/products/prod-iphone-15');
    await page.fill('#stockQuantity', '0');
    await page.click('#updateButton');

    // Navigate to product page
    await page.goto('/products/prod-iphone-15');

    // Verify out of stock message
    await expect(page.locator('#stockStatus')).toContainText('Out of Stock');
    
    // Verify add to cart button is disabled
    await expect(page.locator('#addToCartButton')).toBeDisabled();

    // Validate database state
    const product = await validateDatabaseState(
      'product-service-db',
      'SELECT StockQuantity FROM Products WHERE ProductID = "prod-iphone-15"'
    );
    expect(product[0].StockQuantity).toBe(0);
  });
});
```

### Step 4: Advanced Test Scenarios

#### Scenario 3: Order Processing Flow

**Test** (`scenarios/scenario-03-order-processing/tests/checkout.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Order Processing', () => {
  test('should complete full checkout process', async ({ page }) => {
    // Setup: Login and add items to cart
    await page.goto('/login');
    await page.fill('#email', 'customer@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('#loginButton');

    // Add multiple items to cart
    await page.goto('/products/prod-iphone-15');
    await page.click('#addToCartButton');
    
    await page.goto('/products/prod-samsung-s24');
    await page.selectOption('#quantity', '2');
    await page.click('#addToCartButton');

    // Go to cart
    await page.goto('/cart');

    // Verify cart contents
    await expect(page.locator('.cart-item')).toHaveCount(2);
    
    // Verify total calculation
    const total = await page.locator('#cartTotal').textContent();
    expect(total).toContain('$2,799.97'); // 999.99 + (899.99 * 2)

    // Proceed to checkout
    await page.click('#checkoutButton');

    // Fill shipping information
    await page.fill('#shippingAddress', '123 Main St');
    await page.fill('#city', 'San Francisco');
    await page.fill('#zipCode', '94105');
    await page.selectOption('#state', 'CA');

    // Fill payment information (simulation)
    await page.fill('#cardNumber', '4111111111111111');
    await page.fill('#expiryDate', '12/26');
    await page.fill('#cvv', '123');
    await page.fill('#cardholderName', 'John Customer');

    // Place order
    await page.click('#placeOrderButton');

    // Verify order confirmation
    await expect(page.locator('#orderConfirmation')).toBeVisible();
    
    const orderNumber = await page.locator('#orderNumber').textContent();
    expect(orderNumber).toMatch(/ORD-\d{8}/);

    // Verify redirect to order details
    await expect(page).toHaveURL(/\/orders\/ORD-\d{8}/);

    // Validate database state - inventory should be updated
    const iphoneStock = await validateDatabaseState(
      'product-service-db',
      'SELECT StockQuantity FROM Products WHERE ProductID = "prod-iphone-15"'
    );
    expect(iphoneStock[0].StockQuantity).toBe(49); // 50 - 1

    const samsungStock = await validateDatabaseState(
      'product-service-db', 
      'SELECT StockQuantity FROM Products WHERE ProductID = "prod-samsung-s24"'
    );
    expect(samsungStock[0].StockQuantity).toBe(28); // 30 - 2
  });
});
```

### Step 5: Performance and Load Testing

Create performance-focused scenarios:

**Test** (`scenarios/scenario-04-performance/tests/load-test.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle concurrent user registrations', async ({ page, context }) => {
    const startTime = Date.now();
    
    // Simulate multiple users registering simultaneously
    const registrationPromises = Array.from({ length: 5 }, async (_, index) => {
      const newPage = await context.newPage();
      await newPage.goto('/register');
      
      await newPage.fill('#firstName', `User${index}`);
      await newPage.fill('#lastName', `Test${index}`);
      await newPage.fill('#email', `user${index}@loadtest.com`);
      await newPage.fill('#password', 'LoadTest123!');
      await newPage.fill('#confirmPassword', 'LoadTest123!');
      
      await newPage.click('#registerButton');
      
      await expect(newPage.locator('#successMessage')).toBeVisible();
      await newPage.close();
    });

    await Promise.all(registrationPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify all users were created
    const userCount = await validateDatabaseState(
      'user-service-db',
      'SELECT COUNT(*) as count FROM Users WHERE Email LIKE "%loadtest.com"'
    );
    expect(userCount[0].count).toBe(5);
    
    // Performance assertion (should complete within 10 seconds)
    expect(duration).toBeLessThan(10000);
  });

  test('should maintain search performance with large dataset', async ({ page }) => {
    // This test assumes you've seeded a large number of products
    const startTime = Date.now();
    
    await page.goto('/products');
    await page.fill('#searchInput', 'smartphone');
    await page.click('#searchButton');
    
    // Wait for results to load
    await expect(page.locator('.product-card').first()).toBeVisible();
    
    const endTime = Date.now();
    const searchDuration = endTime - startTime;
    
    // Search should complete within 2 seconds
    expect(searchDuration).toBeLessThan(2000);
    
    // Verify results are paginated for performance
    const resultCount = await page.locator('.product-card').count();
    expect(resultCount).toBeLessThanOrEqual(20); // Max 20 per page
  });
});
```

### Step 6: Database Validation Patterns

Create comprehensive validation files:

**Expected State** (`scenarios/scenario-03-order-processing/expected-product-service.yaml`):
```yaml
tables:
  Products:
    row_count: 3
    columns:
      - name: StockQuantity
        type: INT64
        conditions:
          - operator: ">="
            value: 0
    constraints:
      - type: check
        condition: "StockQuantity >= 0"
        description: "Stock cannot be negative"

  ShoppingCarts:
    row_count_min: 1
    relationships:
      - table: CartItems
        type: one_to_many
        foreign_key: CartID

  CartItems:
    columns:
      - name: Quantity
        type: INT64
        conditions:
          - operator: ">"
            value: 0
    constraints:
      - type: check
        condition: "Quantity > 0"
        description: "Cart items must have positive quantity"

performance_checks:
  - table: Products
    operation: SELECT
    max_duration_ms: 100
    description: "Product queries should be fast"
  
  - table: CartItems
    operation: INSERT
    max_duration_ms: 50
    description: "Adding to cart should be immediate"
```

### Step 7: Running the Complete Test Suite

Execute all scenarios:

```bash
# Initialize the project
make init

# Start emulator and setup databases
make start
make setup

# Run all test scenarios
make run-all-scenarios

# Generate comprehensive test report
make test-report
```

### Expected Output

```
🚀 Running all scenarios...
📋 Environment: PROJECT_ID=test-project, INSTANCE_ID=test-instance, DB_COUNT=1

🏗️ Setting up databases...
✅ Database setup complete

📝 Found scenarios: scenario-01-user-registration scenario-02-product-search scenario-03-order-processing scenario-04-performance

▶️ Running scenario-01-user-registration
🎭 Starting Playwright tests...
✅ All tests passed (4 tests across 3 browsers)
🔍 Validating scenario-01-user-registration database state...
✅ Database validation completed for scenario-01-user-registration
✅ Scenario scenario-01-user-registration completed successfully

▶️ Running scenario-02-product-search  
🎭 Starting Playwright tests...
✅ All tests passed (6 tests across 3 browsers)
🔍 Validating scenario-02-product-search database state...
✅ Database validation completed for scenario-02-product-search
✅ Scenario scenario-02-product-search completed successfully

▶️ Running scenario-03-order-processing
🎭 Starting Playwright tests...
✅ All tests passed (3 tests across 3 browsers)
🔍 Validating scenario-03-order-processing database state...
✅ Database validation completed for scenario-03-order-processing
✅ Scenario scenario-03-order-processing completed successfully

▶️ Running scenario-04-performance
🎭 Starting Playwright tests...
✅ All tests passed (2 tests across 3 browsers)
🔍 Validating scenario-04-performance database state...
✅ Database validation completed for scenario-04-performance
✅ Scenario scenario-04-performance completed successfully

✅ All scenarios completed

📊 Test Summary:
- Total Scenarios: 4
- Total Tests: 15 (across 3 browsers = 45 test executions)
- Success Rate: 100%
- Total Duration: 4m 32s
- Database Validations: 8/8 passed
```

## Key Takeaways

This tutorial demonstrated:

1. **Multi-database Architecture** - Separating concerns with dedicated databases
2. **Comprehensive Test Coverage** - From unit flows to performance testing
3. **Database Validation** - Ensuring data integrity throughout test execution
4. **Realistic Scenarios** - Testing complex user journeys with proper setup
5. **Performance Monitoring** - Including performance assertions in E2E tests

## Next Steps

- **[Real-World Examples](#)** - Industry-specific testing patterns (Coming Soon)
- **[Multi-Database Setup](#)** - Advanced database configuration (Coming Soon)
- **[Performance Testing](../guide/troubleshooting)** - Scaling your test suite
- **[CI/CD Integration](#)** - Automating test execution (Coming Soon)

## Additional Resources

- **[Playwright Best Practices](https://playwright.dev/docs/best-practices)**
- **[Cloud Spanner Schema Design](https://cloud.google.com/spanner/docs/schema-design)**
- **[Database Testing Patterns](https://martinfowler.com/articles/dblogic.html)**