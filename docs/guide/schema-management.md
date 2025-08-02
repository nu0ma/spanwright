# Schema Management

## Overview

Spanwright uses [wrench](https://github.com/cloudspannerecosystem/wrench) for Cloud Spanner schema migrations. Your schemas should be organized in a dedicated directory with numbered SQL files.

## Schema Directory Structure

```
schema/
├── 001_create_users.sql
├── 002_create_products.sql
├── 003_add_user_indexes.sql
└── 004_add_constraints.sql
```

## Writing Migration Files

### File Naming Convention

- Use 3-digit prefixes: `001_`, `002_`, etc.
- Descriptive names: `001_create_users.sql`
- Order matters: migrations run sequentially

### Example Migration

```sql
-- 001_create_users.sql
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Email STRING(255) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserID);

CREATE UNIQUE INDEX UsersByEmail ON Users(Email);
```

## Configuration

### Single Database Setup

```bash
# .env
PRIMARY_DB_NAME=my-app-db
PRIMARY_SCHEMA_PATH=./schema
```

### Multi-Database Setup

```bash
# .env
PRIMARY_DB_NAME=user-service-db
PRIMARY_SCHEMA_PATH=./schemas/users
SECONDARY_DB_NAME=product-service-db
SECONDARY_SCHEMA_PATH=./schemas/products
```

## Make Commands

### Apply Migrations

```bash
# Apply to primary database
make migrate-primary

# Apply to secondary database (if configured)
make migrate-secondary

# Apply to all databases
make setup
```

### Reset Database

```bash
# Drop and recreate primary database
make reset-primary

# Reset all databases
make reset-all
```

## Best Practices

### Migration Guidelines

1. **Always add new migrations** - Never edit existing migration files
2. **Test migrations locally** before committing
3. **Use descriptive names** for tables and columns
4. **Add indexes thoughtfully** - Consider query patterns
5. **Use appropriate data types** for Spanner

### Schema Design Tips

- Use `STRING(36)` for UUIDs
- Use `TIMESTAMP` with `allow_commit_timestamp=true` for audit fields
- Consider interleaved tables for parent-child relationships
- Use `ARRAY` types for one-to-many relationships when appropriate

## Troubleshooting

### Common Issues

**Migration fails with "already exists":**
```bash
# Reset and reapply
make reset-primary
make migrate-primary
```

**Schema path not found:**
- Verify `PRIMARY_SCHEMA_PATH` in `.env`
- Check file permissions
- Ensure directory exists

**Connection errors:**
```bash
# Restart emulator
make stop
make start
```

## Integration with Tests

Schemas are automatically applied during test setup:

1. `make start` - Starts Spanner emulator
2. `make setup` - Applies all schemas
3. Test scenarios run with fresh schema state

See [Writing Tests](./writing-tests) for test-specific schema considerations.