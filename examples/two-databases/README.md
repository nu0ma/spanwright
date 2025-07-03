# Two Databases Example

This example demonstrates Spanwright with two separate Spanner databases, showing how to handle multiple data sources in E2E testing.

## Overview

- **Spanner Databases**: 2 (Primary and Secondary)
- **Tables**: Users table in Primary DB, Logs table in Secondary DB
- **Complexity**: Intermediate

## Quick Start

```bash
# Clone the repository
git clone https://github.com/nu0ma/spanwright.git
cd spanwright/examples/two-databases

# Run the complete E2E test
make run-all-scenarios
```

## What's Included

- **Primary Database**: Users table for core user management
- **Secondary Database**: Logs table for audit and analytics
- **Test Data**: Sample users and logs for validation
- **E2E Tests**: Playwright tests that validate operations across both databases
- **Complete Makefile**: All necessary commands for running tests

## Schema

### Primary Database
```sql
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);
```

### Secondary Database
```sql
CREATE TABLE Logs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(255) NOT NULL,
  IpAddress STRING(50),
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (LogID);
```

## Usage

1. **Initialize**: `make init`
2. **Run Tests**: `make run-all-scenarios`
3. **Clean up**: `make stop`

This example demonstrates how to coordinate E2E tests across multiple Spanner databases.