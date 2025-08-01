# Introduction

Spanwright is a CLI tool that generates comprehensive E2E testing frameworks for Cloud Spanner applications. It combines Go database tools with Playwright browser automation to create realistic testing environments.

## What is Spanwright?

Spanwright solves the challenge of testing applications that use Cloud Spanner as their database. Unlike traditional SQL databases, Spanner requires specialized tools and approaches for effective testing.

### The Problem

Testing Cloud Spanner applications is complex because:

- **Emulator Setup** - Running Spanner emulator requires Docker configuration
- **Schema Management** - Applying DDL changes needs specialized migration tools  
- **Data Seeding** - Populating test data must respect Spanner's unique constraints
- **State Validation** - Verifying database state after tests requires custom tooling
- **Integration Testing** - Coordinating browser automation with database operations

### The Solution

Spanwright generates a complete testing framework that handles:

- ✅ **Automated Setup** - Docker Spanner emulator management
- ✅ **Schema Migrations** - Integration with `wrench` migration tool
- ✅ **Data Management** - YAML-based seeding with `testfixtures`
- ✅ **Browser Testing** - Playwright integration for E2E scenarios  
- ✅ **State Validation** - Declarative database assertions with `spalidate`

## Key Concepts

### Scenario-Based Testing

Each test scenario is a complete, isolated test case:

```
scenarios/user-registration/
├── fixtures/              # Test data (YAML)
├── expected-primary.yaml  # Expected database state
└── tests/                 # Playwright E2E tests
```

### Database-First Approach

Tests start with database state, not browser actions:

1. **Seed** - Load initial data from YAML fixtures
2. **Test** - Run browser automation that modifies data
3. **Validate** - Assert final database state matches expectations

### Multi-Database Support

Handle complex applications with multiple Spanner databases:

- Primary database for core application data
- Secondary database for analytics, logging, etc.
- Independent schema management and validation

## Architecture

### Generated Project Structure

```
your-project/
├── schema/                # Database schemas (.sql)
├── cmd/seed-injector/    # Go tool for data seeding
├── scenarios/            # Test scenarios
│   └── example-01/
│       ├── fixtures/     # YAML test data  
│       ├── expected.yaml # Database assertions
│       └── tests/        # Playwright tests
└── tests/               # Test infrastructure
```

### Technology Stack

- **[testfixtures](https://github.com/go-testfixtures/testfixtures)** - Database seeding from YAML
- **[wrench](https://github.com/cloudspannerecosystem/wrench)** - Spanner schema migrations
- **[spalidate](https://github.com/nu0ma/spalidate)** - Database state validation
- **[Playwright](https://playwright.dev)** - Browser automation
- **[Cloud Spanner Go Client](https://cloud.google.com/go/spanner)** - Database connectivity

## Use Cases

### E2E Testing

Test complete user workflows that span browser interactions and database changes:

```typescript
// Playwright test
await page.fill('#username', 'john_doe')
await page.click('#register')

// Database automatically validated against expected-primary.yaml
```

### Integration Testing

Validate complex database operations and schema changes:

- Multi-table transactions
- Interleaved table relationships  
- Foreign key constraints
- Secondary index usage

### Performance Testing

Benchmark database operations with realistic data volumes:

- Large dataset seeding
- Query performance validation
- Connection pooling behavior
- Concurrent operation testing

### Schema Validation

Verify migration scripts and schema evolution:

- DDL change validation
- Data migration correctness
- Backward compatibility testing
- Index performance impact

## Getting Started

Ready to create your first Spanwright project? Head to the [Getting Started](./getting-started) guide.

## Community & Support

- **GitHub Issues** - Report bugs and request features
- **Documentation** - Comprehensive guides and API reference  
- **Examples** - Working examples in the `examples/` directory
- **Contributing** - See [CONTRIBUTING.md](https://github.com/nu0ma/spanwright/blob/main/CONTRIBUTING.md)