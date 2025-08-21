# Quick Start

Get up and running with Spanwright in 5 minutes. This guide will walk you through creating your first Cloud Spanner E2E testing project.

## Before You Start

Make sure you have the [prerequisites installed](./installation):
- Node.js 22.15.1+
- Docker  
- Go 1.24.5+
- wrench CLI tool
- spalidate CLI tool

## Step 1: Create Your Project

Create a new Spanwright project with the interactive setup:

```bash
npx spanwright my-spanner-tests
```

The CLI will ask you a few questions:

```
? How many Spanner databases? (1)
? Primary database name: (primary-db) 
? Primary database schema path: ./schema
```

**Recommendation**: Start with 1 database for your first project.

## Step 2: Navigate to Your Project

```bash
cd my-spanner-tests
```

Your project structure will look like this:

```
my-spanner-tests/
├── schema/                     # Database schemas  
│   └── 001_example.sql
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── fixtures/           # YAML seed data
│       ├── expected-primary.yaml
│       └── tests/
├── cmd/seed-injector/         # Go data seeding tool
├── tests/                     # Test infrastructure  
├── Makefile                   # Workflow automation
└── playwright.config.ts       # Playwright configuration
```

## Step 3: Install Dependencies

```bash
make init
```

This command will:
- Install Node.js dependencies
- Install Playwright browsers
- Build Go tools
- Set up the development environment

## Step 4: Start the Spanner Emulator

```bash
make start
```

This starts the Cloud Spanner emulator in Docker. You should see:

```
✅ Spanner emulator is running on port 9010
✅ Instance and databases are ready
```

## Step 5: Apply Database Schema

```bash
make setup
```

This applies your database schemas using wrench migrations:

```
✅ Schema migrations applied successfully
✅ Database 'primary-db' is ready
```

## Step 6: Run Your First Test

```bash
make run-all-scenarios
```

This comprehensive command will:

1. **Inject seed data** from YAML fixtures
2. **Run Playwright E2E tests** in multiple browsers
3. **Validate database state** using spalidate

You should see output like:

```
📝 Injecting seed data for scenario: example-01-basic-setup
✅ Seed data injected successfully

🎭 Running Playwright tests...
✅ All tests passed (3 tests across 3 browsers)

✅ Database validation passed
✅ Expected state matches actual state

🎉 Scenario 'example-01-basic-setup' completed successfully
```

## Step 7: Explore the Example

Let's look at what just ran:

### Database Schema
```sql
-- schema/001_example.sql
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255),
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID);
```

### Seed Data
```yaml
# scenarios/example-01-basic-setup/fixtures/Users.yml
- UserID: "user-123"
  Name: "Alice Johnson"  
  Email: "alice@example.com"
  CreatedAt: "2024-01-01T00:00:00Z"
```

### E2E Test
```typescript
// scenarios/example-01-basic-setup/tests/basic.spec.ts
import { test, expect } from '@playwright/test';

test('user registration flow', async ({ page }) => {
  // Navigate to your app
  await page.goto('http://localhost:3000');
  
  // Test user interactions
  await page.fill('#name', 'Bob Smith');
  await page.fill('#email', 'bob@example.com');
  await page.click('#register');
  
  // Verify UI feedback
  await expect(page.locator('#success')).toBeVisible();
});
```

### Database Validation
```yaml
# scenarios/example-01-basic-setup/expected-primary.yaml
tables:
  Users:
    row_count: 2  # 1 seed + 1 new user
    rows:
      - UserID: "user-123"
        Name: "Alice Johnson"
      # New user from test will be validated automatically
```

## Common Commands

Now that your project is set up, here are the most useful commands:

```bash
# Project lifecycle
make start                    # Start Spanner emulator
make setup               # Apply database schemas
make clean                   # Clean up containers and build artifacts

# Testing
make run-all-scenarios       # Full test suite (seed + test + validate)
make test-e2e               # Run Playwright tests only
make list-scenarios         # Show available test scenarios

# Development
make seed SCENARIO=example-01  # Inject seed data for specific scenario
make validate SCENARIO=example-01  # Validate database state
make help                    # Show all available commands
```

## What's Next?

🎉 **Congratulations!** You've successfully:
- Created a Spanwright project
- Run your first E2E test with database validation
- Understood the core workflow

### Continue Learning

1. **[Project Structure](./project-structure)** - Deep dive into the generated files
2. **[Writing Tests](./writing-tests)** - Create your own test scenarios  
3. **[Schema Management](./schema-management)** - Learn about database migrations
4. **[Database Seeding](./database-seeding)** - Master YAML fixture management

### Common Next Steps

**Add Your Own Schema:**
```bash
# Create a new migration
echo "CREATE TABLE Products (...)" > schema/002_products.sql
make setup
```

**Create a New Test Scenario:**
```bash
# Copy the example scenario
cp -r scenarios/example-01-basic-setup scenarios/my-new-test
# Customize fixtures and tests
```

**Integrate with Your App:**
```bash
# Update playwright.config.ts to point to your application
# Modify test URLs and selectors for your app
```

## Getting Help

- **Documentation**: [Full guide](https://nu0ma.github.io/spanwright)
- **Examples**: [Real-world scenarios](../examples/tutorials)  
- **Issues**: [GitHub Issues](https://github.com/nu0ma/spanwright/issues)
- **Discussions**: [Community support](https://github.com/nu0ma/spanwright/discussions)

Ready to build comprehensive E2E tests for your Cloud Spanner applications! 🚀