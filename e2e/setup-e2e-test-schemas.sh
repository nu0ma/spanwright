#!/bin/bash

# CI Schema Setup Script
# Creates temporary schema files for testing actual CLI in CI environment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Global variables
TEMP_SCHEMA_BASE=""
PRIMARY_SCHEMA_DIR=""
SECONDARY_SCHEMA_DIR=""

setup_schema_directories() {
    log_info "Setting up temporary schemas for CI testing..."
    log_info "Creating secure temporary schema directories..."

    # Create temporary base directory
    TEMP_SCHEMA_BASE=$(mktemp -d -t ci-schemas-XXXXXX)
    
    # Create subdirectories
    PRIMARY_SCHEMA_DIR="$TEMP_SCHEMA_BASE/primary"
    SECONDARY_SCHEMA_DIR="$TEMP_SCHEMA_BASE/secondary"
    
    mkdir -p "$PRIMARY_SCHEMA_DIR"
    mkdir -p "$SECONDARY_SCHEMA_DIR"
    
    log_info "Primary schema directory: $PRIMARY_SCHEMA_DIR"
    log_info "Secondary schema directory: $SECONDARY_SCHEMA_DIR"
}

create_primary_schema() {
    log_info "Creating primary database schema..."
    
    cat > "$PRIMARY_SCHEMA_DIR/001_initial_schema.sql" << 'EOF'
-- Primary Database Schema for CI Testing
-- E-commerce tables matching template expectations

CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);

CREATE TABLE Companies (
  CompanyID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (CompanyID);

CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  IsActive BOOL NOT NULL
) PRIMARY KEY (ProductID);

CREATE TABLE Orders (
  OrderID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  TotalAmount INT64 NOT NULL,
  Status STRING(50) NOT NULL,
  OrderDate TIMESTAMP NOT NULL
) PRIMARY KEY (OrderID);

CREATE TABLE OrderItems (
  OrderItemID STRING(36) NOT NULL,
  OrderID STRING(36) NOT NULL,
  ProductID STRING(36) NOT NULL,
  Quantity INT64 NOT NULL,
  UnitPrice INT64 NOT NULL
) PRIMARY KEY (OrderItemID);
EOF
    
    log_info "Primary schema file created: $PRIMARY_SCHEMA_DIR/001_initial_schema.sql"
}

create_secondary_schema() {
    log_info "Creating secondary database schema..."
    
    cat > "$SECONDARY_SCHEMA_DIR/001_initial_schema.sql" << 'EOF'
-- Secondary Database Schema for CI Testing
-- Analytics tables matching template expectations

CREATE TABLE SystemConfig (
  ConfigID STRING(36) NOT NULL,
  ConfigKey STRING(255) NOT NULL,
  ConfigValue STRING(1000) NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (ConfigID);

CREATE TABLE Analytics (
  AnalyticsID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  EventType STRING(100) NOT NULL,
  PageURL STRING(500),
  Timestamp TIMESTAMP NOT NULL
) PRIMARY KEY (AnalyticsID);

CREATE TABLE UserLogs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(255) NOT NULL,
  IpAddress STRING(50),
  UserAgent STRING(500),
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (LogID);
EOF
    
    log_info "Secondary schema file created: $SECONDARY_SCHEMA_DIR/001_initial_schema.sql"
}

display_environment_variables() {
    log_info "Environment variables for CI setup:"
    echo ""
    echo "export SPANWRIGHT_DB_COUNT=2"
    echo "export SPANWRIGHT_PRIMARY_DB_NAME=ci-primary-db"
    echo "export SPANWRIGHT_PRIMARY_SCHEMA_PATH=$PRIMARY_SCHEMA_DIR"
    echo "export SPANWRIGHT_SECONDARY_DB_NAME=ci-secondary-db"
    echo "export SPANWRIGHT_SECONDARY_SCHEMA_PATH=$SECONDARY_SCHEMA_DIR"
    echo "export CI=true"
    echo ""
}

main() {
    if setup_schema_directories && create_primary_schema && create_secondary_schema; then
        display_environment_variables
        
        log_info "============================================================"
        log_info "CI schema setup completed successfully!"
        log_info "============================================================"
        log_info ""
        log_info "Next steps:"
        log_info "1. Export the environment variables above"
        log_info "2. Run: npx spanwright ci-test-project"
        log_info "3. cd ci-test-project && make init && make run-all-scenarios"
        
        return 0
    else
        log_error "Schema setup failed"
        return 1
    fi
}

# Execute main function
main "$@"