# Scenario Template - New Scenario Creation Guide

## ⭐ Super Easy Method (Recommended)
```bash
# Create a new scenario with one command (auto-generate all file templates)
make new-scenario SCENARIO=scenario-02-my-test

# Edit the generated files
# 1. scenarios/scenario-02-my-test/seed-data/*.json - Seed data
# 2. scenarios/scenario-02-my-test/expected-*.yaml - Expected values
# 3. scenarios/scenario-02-my-test/tests/*.spec.ts - E2E tests
```

## Scenario Structure

Each scenario is created with the following structure:

```
scenarios/
├── scenario-01-basic-setup/
│   ├── description.md                # Scenario description (auto-generated)
│   ├── scenario-config.yaml          # Scenario configuration file (auto-generated)
│   ├── seed-data/                    # Seed data for scenario
│   │   ├── primary-seed.json          # For Primary DB (template auto-generated)
│   │   └── secondary-seed.json    # For Secondary DB (template auto-generated)
│   ├── expected-primary.yaml          # Primary DB expected values (template auto-generated)
│   ├── expected-secondary.yaml    # Secondary DB expected values (template auto-generated)
│   └── tests/                        # 🆕 E2E tests (auto-generated)
│       ├── fixtures/
│       │   └── db-validator.ts       # DB validation helper (auto-copied)
│       └── scenario-01-basic-setup.spec.ts  # Test file (auto-generated)
├── scenario-02-custom-test/
│   ├── scenario-config.yaml
│   ├── seed-data/
│   └── ...
└── ...
```

## Configuration File Structure

### Common Configuration (config/common-database-config.yaml)
Defines common DB settings for all scenarios:

```yaml
# Common database configuration file
databases:
  primary-db:
    name: Primary Database (Portal)
    schema: <YOUR_PRIMARY_SCHEMA_PATH>
  
  secondary-db:
    name: Secondary Database (Realtor)
    schema: <YOUR_SECONDARY_SCHEMA_PATH>

# Default configuration values
defaults:
  timeout: 300
  retry_count: 1
  cleanup:
    temp_files: true
    stop_emulator: false
```

### Required Files

### 1. scenario-config.yaml (Scenario Configuration)
A lightweight configuration file that defines **scenario-specific settings only**:

```yaml
# Scenario-specific configuration file
# Common settings are defined in config/common-database-config.yaml
# Only scenario-specific information is described here

name: scenario-01-basic-setup
description: Basic setup test
version: "1.0"

# Scenario-specific file path settings
scenario_files:
  primary-db:
    seed: seed-data/primary-seed.json
    expected: expected-primary.yaml
  
  secondary-db:
    seed: seed-data/secondary-seed.json
    expected: expected-secondary.yaml
```

### 2. seed-data/ Directory
Seed data files for each database

### 3. expected-*.yaml
Database expected value configuration files

```yaml
tables:
  Billing:
    count: 1
    sample:
      Name: "Test billing configuration"
  
  Company:
    count: 0  # Empty table
  
  Realtor:
    count: 1
    sample:
      Name: "Test real estate company"
```

## Optional Files

- **description.md**: Detailed scenario description (for humans)

## Available Steps

### start_emulator
Starts the Spanner emulator.

### setup_databases: [db-list]
Applies schema to specified databases and inserts seed data.
- `db-list`: Array of target database IDs

### validate_databases: [db-list]
Executes validation for specified databases.
- `db-list`: Array of target database IDs

## Steps to Create a New Scenario

### ⭐ Automated Method (Recommended)
```bash
# 1. Create new scenario (auto-generate all files)
make new-scenario SCENARIO=scenario-02-my-test

# 2. Edit the generated template files
# - scenarios/scenario-02-my-test/seed-data/primary-seed.json
# - scenarios/scenario-02-my-test/seed-data/secondary-seed.json
# - scenarios/scenario-02-my-test/expected-primary.yaml
# - scenarios/scenario-02-my-test/expected-secondary.yaml
# - scenarios/scenario-02-my-test/tests/scenario-02-my-test.spec.ts

# 3. Run tests
make setup-scenario SCENARIO=scenario-02-my-test    # Setup only
make validate-scenario SCENARIO=scenario-02-my-test # Validation only
make test-e2e-scenario SCENARIO=scenario-02-my-test # E2E tests
# or
make run-all-scenarios                              # Run all scenarios at once
```

### Traditional Manual Method
<details>
<summary>Click to show details (for advanced users)</summary>

1. **Create directories**:
```bash
mkdir -p scenarios/scenario-02-my-test/seed-data
mkdir -p scenarios/scenario-02-my-test/tests/fixtures
```

2. **Create scenario-config.yaml**: 
```bash
cat > scenarios/scenario-02-my-test/scenario-config.yaml << 'EOF'
name: scenario-02-my-test
description: My custom test
version: "1.0"

scenario_files:
  primary-db:
    seed: seed-data/primary-seed.json
    expected: expected-primary.yaml
  
  secondary-db:
    seed: seed-data/secondary-seed.json
    expected: expected-secondary.yaml
EOF
```

3. **Prepare seed data**: Create JSON files for each database
4. **Create expected value settings**: Create expected-*.yaml files
5. **Create E2E tests**: Create tests/*.spec.ts files

</details>

## Benefits

- **🚀 Significant productivity improvement**: Auto-generate all files with `make new-scenario`
- **📝 Rich templates**: Templates with practical sample code
- **🔧 Eliminate configuration duplication**: Manage DB settings and schema paths in one place
- **⚡ Prevent configuration errors**: Prevent inconsistencies by sharing common settings
- **📦 E2E test integration**: Playwright tests are also automatically generated and placed
- **🛠️ Improved maintainability**: When changing common settings, update only one file to apply to all scenarios

## Recommended Workflow for Team Use

1. **Initial setup**: `make init`
2. **Create new scenario**: `make new-scenario SCENARIO=my-scenario`
3. **Prepare data**: Edit seed data and expected values
4. **Run tests**: `make run-all-scenarios`
5. **Continuous validation**: Regularly run `make run-all-scenarios`