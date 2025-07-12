# Secondary Database Fixtures

This directory contains fixture files for the secondary database (2-database setup only).

## How to Use

1. Create YAML fixture files that match your secondary database schema
2. Each file should correspond to a table in your secondary database
3. Use testfixtures format (https://github.com/go-testfixtures/testfixtures)

## Example Structure

```
fixtures/secondary/
├── YourSecondaryTable1.yml
├── YourSecondaryTable2.yml
└── README.md (this file)
```

## Example Fixture File Format

```yaml
# YourSecondaryTable.yml
- ID: "test-id-1"
  Data: "Test data 1"
  Timestamp: "2024-01-01T00:00:00Z"

- ID: "test-id-2"
  Data: "Test data 2"
  Timestamp: "2024-01-01T00:00:00Z"
```

Add your own fixture files based on your secondary database schema.