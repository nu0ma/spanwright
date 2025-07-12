# Primary Database Fixtures

This directory contains fixture files for the primary database.

## How to Use

1. Create YAML fixture files that match your database schema
2. Each file should correspond to a table in your database
3. Use testfixtures format (https://github.com/go-testfixtures/testfixtures)

## Example Structure

```
fixtures/primary/
├── YourTable1.yml
├── YourTable2.yml
└── README.md (this file)
```

## Example Fixture File Format

```yaml
# YourTable.yml
- ID: "test-id-1"
  Name: "Test Record 1"
  CreatedAt: "2024-01-01T00:00:00Z"

- ID: "test-id-2"
  Name: "Test Record 2"
  CreatedAt: "2024-01-01T00:00:00Z"
```

Add your own fixture files based on your database schema.