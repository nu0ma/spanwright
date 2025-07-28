# Project Structure

Understanding the generated project structure helps you organize tests effectively.

## Directory Layout

```
your-project/
├── Makefile                    # 🔧 Workflow automation
├── .env                        # 🔐 Environment configuration  
├── package.json               # 📦 Node.js dependencies
├── playwright.config.ts       # 🎭 Playwright configuration
├── tsconfig.json              # 📝 TypeScript settings
├── go.mod                     # 🐹 Go module definition
├── schema/                    # 🗄️ Database schemas
├── cmd/                       # 🛠️ Go CLI tools
├── internal/                  # 📚 Go internal packages  
├── scenarios/                 # 🧪 Test scenarios
└── tests/                     # 🔬 Test infrastructure
```

## Schema Directory

Database schema files that define your Spanner tables:

```
schema/
├── 001_initial_schema.sql     # Core tables (Users, etc.)
├── 002_products_schema.sql    # Product-related tables
└── 003_analytics_schema.sql   # Analytics tables
```

**Key Features:**
- **Sequential Application** - Files applied in alphabetical order
- **Multiple Files** - Organize schemas by domain/feature
- **SQL Format** - Standard Spanner DDL statements

## Go Tools (`cmd/`)

Command-line tools written in Go for database operations:

```
cmd/
└── seed-injector/
    └── main.go                # Data seeding tool
```

The `seed-injector` reads YAML fixture files and populates the database using the [testfixtures](https://github.com/go-testfixtures/testfixtures) library.

## Internal Packages (`internal/`)

Shared Go code used by CLI tools:

```
internal/
└── spanwright/
    ├── spanwright.go          # Core configuration and database logic
    └── security_test.go       # Security validation tests
```

**Provides:**
- Database connection management
- Configuration loading from `.env`
- Input validation and security checks
- Retry logic for database operations

## Test Scenarios (`scenarios/`)

Each scenario is a complete test case with its own data and expectations:

```
scenarios/
└── example-01-basic-setup/
    ├── fixtures/              # 🌱 Seed data (YAML)
    │   ├── Users.yml
    │   └── Products.yml
    ├── expected-primary.yaml  # ✅ Expected database state
    └── tests/                 # 🎭 Playwright E2E tests
        └── basic.spec.ts
```

### Scenario Components

1. **Fixtures** - YAML files defining test data
2. **Expected State** - YAML defining what the database should contain after tests
3. **E2E Tests** - Playwright tests that interact with the browser and database

## Test Infrastructure (`tests/`)

Shared testing utilities and setup:

```
tests/
├── global-setup.ts            # Emulator startup
├── global-teardown.ts         # Cleanup after tests
├── database-isolation.ts      # Database management
└── test-utils.ts              # Shared testing utilities
```

## Configuration Files

### `.env` - Environment Variables

```bash
# Database Settings
DB_COUNT=1
PRIMARY_DATABASE_ID=primary-db
PRIMARY_SCHEMA_PATH=./schema

# Emulator Settings  
PROJECT_ID=test-project
INSTANCE_ID=test-instance
SPANNER_EMULATOR_HOST=localhost:9010
```

### `Makefile` - Workflow Commands

Provides consistent commands across all generated projects:

- **Setup**: `make init`, `make start`, `make setup-all`
- **Testing**: `make run-all-scenarios`, `make test-e2e`
- **Development**: `make clean`, `make help`

### `playwright.config.ts` - Test Configuration

Configures Playwright for browser automation with database integration.

## Multi-Database Projects

When using 2 databases, the structure includes:

```
schema2/                       # Secondary database schemas
scenarios/
└── example-01-basic-setup/
    ├── fixtures/
    │   ├── primary/           # Primary DB fixtures
    │   │   ├── Users.yml
    │   │   └── Products.yml
    │   └── secondary/         # Secondary DB fixtures
    │       ├── Analytics.yml
    │       └── UserLogs.yml
    ├── expected-primary.yaml  # Primary DB expectations
    └── expected-secondary.yaml # Secondary DB expectations
```

## Best Practices

### Schema Organization

- **Start Simple** - Begin with a single schema file
- **Split by Domain** - Separate user, product, analytics schemas
- **Use Prefixes** - Number files for execution order (001_, 002_)

### Scenario Naming

- **Descriptive Names** - `example-01-user-registration`  
- **Sequential Numbers** - Helps with organization and execution order
- **Feature-Based** - Group related test scenarios together

### Fixture Management

- **Minimal Data** - Only include data needed for the specific test
- **Realistic Values** - Use representative data that matches production patterns
- **Referential Integrity** - Ensure foreign key relationships are valid