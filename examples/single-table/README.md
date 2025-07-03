# Single Table Example

This example demonstrates the simplest possible Spanwright setup with a single database and single table.

## Overview

- **Database**: 1 (Primary only)
- **Tables**: 1 (Users)
- **Complexity**: Beginner

## Quick Start

```bash
# Clone the repository
git clone https://github.com/nu0ma/spanwright.git
cd spanwright/examples/single-table

# Run the complete E2E test
make run-all-scenarios
```

## What's Included

- **Users Table**: Basic user management with ID, name, email, status, and creation timestamp
- **Test Data**: Sample users for validation
- **E2E Tests**: Playwright tests that validate database operations
- **Complete Makefile**: All necessary commands for running tests

## Schema

```sql
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);
```

## Usage

1. **Initialize**: `make init`
2. **Run Tests**: `make run-all-scenarios`
3. **Clean up**: `make stop`

This example is perfect for understanding the basic Spanwright workflow.