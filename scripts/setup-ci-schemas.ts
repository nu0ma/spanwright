#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

/**
 * CI Schema Setup Script
 * Creates temporary schema files for testing actual CLI in CI environment
 */

const TEMP_SCHEMA_BASE = '/tmp/ci-schemas';
const PRIMARY_SCHEMA_DIR = path.join(TEMP_SCHEMA_BASE, 'primary');
const SECONDARY_SCHEMA_DIR = path.join(TEMP_SCHEMA_BASE, 'secondary');

class CISchemaSetup {
  constructor() {
    this.log('Setting up temporary schemas for CI testing...');
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} ${message}`);
  }

  /**
   * Create temporary schema directories
   */
  createSchemaDirectories(): void {
    this.log('Creating schema directories...');

    // Clean up existing directories
    if (fs.existsSync(TEMP_SCHEMA_BASE)) {
      fs.rmSync(TEMP_SCHEMA_BASE, { recursive: true, force: true });
    }

    // Create new directories
    fs.mkdirSync(PRIMARY_SCHEMA_DIR, { recursive: true });
    fs.mkdirSync(SECONDARY_SCHEMA_DIR, { recursive: true });

    this.log(`Primary schema directory: ${PRIMARY_SCHEMA_DIR}`);
    this.log(`Secondary schema directory: ${SECONDARY_SCHEMA_DIR}`);
  }

  /**
   * Create primary database schema file
   */
  createPrimarySchema(): void {
    this.log('Creating primary database schema...');

    const primarySchema = `-- Primary Database Schema for CI Testing
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
`;

    const schemaPath = path.join(PRIMARY_SCHEMA_DIR, '001_initial_schema.sql');
    fs.writeFileSync(schemaPath, primarySchema);
    this.log(`Primary schema file created: ${schemaPath}`);
  }

  /**
   * Create secondary database schema file
   */
  createSecondarySchema(): void {
    this.log('Creating secondary database schema...');

    const secondarySchema = `-- Secondary Database Schema for CI Testing
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
`;

    const schemaPath = path.join(SECONDARY_SCHEMA_DIR, '001_initial_schema.sql');
    fs.writeFileSync(schemaPath, secondarySchema);
    this.log(`Secondary schema file created: ${schemaPath}`);
  }

  /**
   * Display environment variables for CI use
   */
  displayEnvironmentVariables(): void {
    this.log('Environment variables for CI setup:');
    console.log('');
    console.log('export SPANWRIGHT_DB_COUNT=2');
    console.log('export SPANWRIGHT_PRIMARY_DB_NAME=ci-primary-db');
    console.log(`export SPANWRIGHT_PRIMARY_SCHEMA_PATH=${PRIMARY_SCHEMA_DIR}`);
    console.log('export SPANWRIGHT_SECONDARY_DB_NAME=ci-secondary-db');
    console.log(`export SPANWRIGHT_SECONDARY_SCHEMA_PATH=${SECONDARY_SCHEMA_DIR}`);
    console.log('export CI=true');
    console.log('');
  }

  /**
   * Main execution function
   */
  run(): boolean {
    try {
      this.createSchemaDirectories();
      this.createPrimarySchema();
      this.createSecondarySchema();
      this.displayEnvironmentVariables();

      this.log('='.repeat(60));
      this.log('CI schema setup completed successfully!');
      this.log('='.repeat(60));
      this.log('');
      this.log('Next steps:');
      this.log('1. Export the environment variables above');
      this.log('2. Run: npx spanwright ci-test-project');
      this.log('3. cd ci-test-project && make init && make run-all-scenarios');

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Schema setup error: ${message}`, 'error');
      return false;
    }
  }
}

// Script execution
if (process.argv[1] === __filename) {
  const setup = new CISchemaSetup();
  const success = setup.run();
  process.exit(success ? 0 : 1);
}

export default CISchemaSetup;
