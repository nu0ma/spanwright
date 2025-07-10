#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { createSecureTempDir } from '../src/secure-temp';

/**
 * CI Schema Setup Script
 * Creates temporary schema files for testing actual CLI in CI environment
 */

class CISchemaSetup {
  private tempSchemaBase: string = '';
  private primarySchemaDir: string = '';
  private secondarySchemaDir: string = '';

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
  async createSchemaDirectories(): Promise<void> {
    this.log('Creating secure temporary schema directories...');

    // Create secure temporary base directory
    this.tempSchemaBase = await createSecureTempDir('ci-schemas-');
    
    // Create subdirectories
    this.primarySchemaDir = path.join(this.tempSchemaBase, 'primary');
    this.secondarySchemaDir = path.join(this.tempSchemaBase, 'secondary');
    
    await fs.promises.mkdir(this.primarySchemaDir, { recursive: true });
    await fs.promises.mkdir(this.secondarySchemaDir, { recursive: true });

    this.log(`Primary schema directory: ${this.primarySchemaDir}`);
    this.log(`Secondary schema directory: ${this.secondarySchemaDir}`);
  }

  /**
   * Create primary database schema file
   */
  async createPrimarySchema(): Promise<void> {
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

    const schemaPath = path.join(this.primarySchemaDir, '001_initial_schema.sql');
    await fs.promises.writeFile(schemaPath, primarySchema);
    this.log(`Primary schema file created: ${schemaPath}`);
  }

  /**
   * Create secondary database schema file
   */
  async createSecondarySchema(): Promise<void> {
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

    const schemaPath = path.join(this.secondarySchemaDir, '001_initial_schema.sql');
    await fs.promises.writeFile(schemaPath, secondarySchema);
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
    console.log(`export SPANWRIGHT_PRIMARY_SCHEMA_PATH=${this.primarySchemaDir}`);
    console.log('export SPANWRIGHT_SECONDARY_DB_NAME=ci-secondary-db');
    console.log(`export SPANWRIGHT_SECONDARY_SCHEMA_PATH=${this.secondarySchemaDir}`);
    console.log('export CI=true');
    console.log('');
  }

  /**
   * Main execution function
   */
  async run(): Promise<boolean> {
    try {
      await this.createSchemaDirectories();
      await this.createPrimarySchema();
      await this.createSecondarySchema();
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
  setup.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default CISchemaSetup;
