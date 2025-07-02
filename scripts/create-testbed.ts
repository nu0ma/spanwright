#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Development testbed auto-creation script
 * Creates a Spanwright project with fixed configuration and test schemas
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const TESTBED_DIR = path.join(PROJECT_ROOT, 'dev-testbed');
const TESTBED_PROJECT_NAME = 'spanwright-testbed';

interface SchemaPaths {
  primarySchemaPath: string;
  secondarySchemaPath: string;
}

class TestbedCreator {
  constructor() {
    this.log('Starting Spanwright development testbed creation...');
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Clean up existing testbed
   */
  cleanup(): void {
    if (fs.existsSync(TESTBED_DIR)) {
      this.log('Removing existing testbed...');
      fs.rmSync(TESTBED_DIR, { recursive: true, force: true });
    }
  }

  /**
   * Create test schema files
   */
  createTestSchemas(): SchemaPaths {
    this.log('Creating test schema files...');
    
    const schemasDir = path.join(TESTBED_DIR, 'test-schemas');
    const primarySchemaDir = path.join(schemasDir, 'primary-db');
    const secondarySchemaDir = path.join(schemasDir, 'secondary-db');
    
    // Create directories
    fs.mkdirSync(primarySchemaDir, { recursive: true });
    fs.mkdirSync(secondarySchemaDir, { recursive: true });
    
    // Primary DB schema
    const primarySchema = `-- Primary Database Schema for E2E Testing
-- Companies table
CREATE TABLE Companies (
  company_id STRING(36) NOT NULL,
  name STRING(255) NOT NULL,
  email STRING(255),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (company_id);

-- Users table
CREATE TABLE Users (
  user_id STRING(36) NOT NULL,
  company_id STRING(36) NOT NULL,
  email STRING(255) NOT NULL,
  name STRING(255) NOT NULL,
  password_hash STRING(255) NOT NULL,
  role STRING(50) NOT NULL,
  is_active BOOL NOT NULL DEFAULT (true),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (user_id),
  FOREIGN KEY (company_id) REFERENCES Companies (company_id);

-- Sessions table for authentication
CREATE TABLE UserSessions (
  session_id STRING(36) NOT NULL,
  user_id STRING(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (session_id),
  FOREIGN KEY (user_id) REFERENCES Users (user_id);
`;

    // Secondary DB schema
    const secondarySchema = `-- Secondary Database Schema for E2E Testing
-- Analytics and Metrics
CREATE TABLE UserAnalytics (
  analytics_id STRING(36) NOT NULL,
  user_id STRING(36) NOT NULL,
  event_type STRING(100) NOT NULL,
  event_data JSON,
  timestamp TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (analytics_id, timestamp),
  INTERLEAVE IN PARENT UserAnalytics ON DELETE CASCADE;

-- Configuration table
CREATE TABLE SystemConfig (
  config_key STRING(255) NOT NULL,
  config_value STRING(MAX) NOT NULL,
  description STRING(500),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (config_key);

-- Audit logs
CREATE TABLE AuditLogs (
  log_id STRING(36) NOT NULL,
  user_id STRING(36),
  action STRING(255) NOT NULL,
  resource_type STRING(100) NOT NULL,
  resource_id STRING(36),
  details JSON,
  timestamp TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (log_id, timestamp),
  INTERLEAVE IN PARENT AuditLogs ON DELETE CASCADE;
`;

    // Write schema files
    fs.writeFileSync(path.join(primarySchemaDir, '001_initial_schema.sql'), primarySchema);
    fs.writeFileSync(path.join(secondarySchemaDir, '001_initial_schema.sql'), secondarySchema);
    
    this.log('Test schema files created successfully');
    
    return {
      primarySchemaPath: primarySchemaDir,
      secondarySchemaPath: secondarySchemaDir
    };
  }

  /**
   * Create Spanwright project
   */
  async createSpanwrightProject(schemaPaths: SchemaPaths): Promise<string> {
    this.log('Creating Spanwright project...');
    
    try {
      // Build CLI first
      this.log('Building CLI...');
      execSync('npm run build', { 
        cwd: PROJECT_ROOT, 
        stdio: 'pipe'
      });
      
      // Copy template files manually instead of using CLI
      const projectPath = path.join(TESTBED_DIR, TESTBED_PROJECT_NAME);
      
      // Copy template directory
      const templateDir = path.join(PROJECT_ROOT, 'template');
      this.copyDirectory(templateDir, projectPath);
      
      // Generate configuration files
      this.generateConfigFiles(projectPath, schemaPaths);
      
      this.log('Spanwright project created successfully');
      return projectPath;
      
    } catch (error: any) {
      throw new Error(`Project creation error: ${error.message}`);
    }
  }

  /**
   * Recursively copy directory
   */
  private copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Generate configuration files
   */
  private generateConfigFiles(projectPath: string, schemaPaths: SchemaPaths): void {
    this.log('Generating configuration files...');
    
    // .env file
    const envContent = `# ================================================
# Spanner E2E Testing Framework Configuration
# Automatically generated for development testbed
# ================================================

# 🔧 Database Settings
DB_COUNT=2
PRIMARY_DB_ID=primary-db
PRIMARY_DB_SCHEMA_PATH=${schemaPaths.primarySchemaPath}
SECONDARY_DB_ID=secondary-db
SECONDARY_DB_SCHEMA_PATH=${schemaPaths.secondarySchemaPath}

# 📊 Project Settings
PROJECT_ID=test-project
INSTANCE_ID=test-instance

# 🐳 Docker Settings
DOCKER_IMAGE=gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME=spanner-emulator
DOCKER_SPANNER_PORT=9010
DOCKER_ADMIN_PORT=9020
DOCKER_STARTUP_WAIT=20

# 🧪 Test Settings
TEST_ACCOUNT_PASSWORD=test-password-123
`;
    
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);
    
    // Rename _package.json to package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(path.join(projectPath, '_package.json'))) {
      fs.renameSync(path.join(projectPath, '_package.json'), packageJsonPath);
    }
    
    // Rename _gitignore to .gitignore
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (fs.existsSync(path.join(projectPath, '_gitignore'))) {
      fs.renameSync(path.join(projectPath, '_gitignore'), gitignorePath);
    }
    
    // Convert go.mod.template to go.mod
    const goModPath = path.join(projectPath, 'go.mod');
    if (fs.existsSync(path.join(projectPath, 'go.mod.template'))) {
      let goModContent = fs.readFileSync(path.join(projectPath, 'go.mod.template'), 'utf8');
      goModContent = goModContent.replace(/PROJECT_NAME/g, TESTBED_PROJECT_NAME);
      fs.writeFileSync(goModPath, goModContent);
      fs.unlinkSync(path.join(projectPath, 'go.mod.template'));
    }
    
    this.log('Configuration files generated successfully');
  }

  /**
   * Generate test data
   */
  generateTestData(projectPath: string): void {
    this.log('Generating test data...');
    
    const scenarioDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup', 'seed-data');
    
    // Primary DB test data
    const primarySeedData = [
      {
        table: "Companies",
        data: [
          {
            company_id: "test-company-001",
            name: "Test Company Ltd.",
            email: "contact@testcompany.com",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          }
        ]
      },
      {
        table: "Users",
        data: [
          {
            user_id: "test-user-001",
            company_id: "test-company-001",
            email: "e2e-test-user@example.com",
            name: "E2E Test User",
            password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRRJQc8rDKFJiY6", // test-password-123
            role: "admin",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          }
        ]
      }
    ];
    
    // Secondary DB test data
    const secondarySeedData = [
      {
        table: "SystemConfig",
        data: [
          {
            config_key: "app_version",
            config_value: "1.0.0",
            description: "Application version",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          },
          {
            config_key: "maintenance_mode",
            config_value: "false",
            description: "Maintenance mode flag",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          }
        ]
      }
    ];
    
    fs.writeFileSync(
      path.join(scenarioDir, 'primary-seed.json'),
      JSON.stringify(primarySeedData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(scenarioDir, 'secondary-seed.json'),
      JSON.stringify(secondarySeedData, null, 2)
    );
    
    this.log('Test data generated successfully');
  }

  /**
   * Install dependencies
   */
  async installDependencies(projectPath: string): Promise<void> {
    this.log('Installing dependencies...');
    
    try {
      // npm install
      execSync('npm install', { 
        cwd: projectPath, 
        stdio: 'inherit'
      });
      
      // go mod tidy
      execSync('go mod tidy', { 
        cwd: projectPath, 
        stdio: 'inherit'
      });
      
      this.log('Dependencies installed successfully');
      
    } catch (error: any) {
      throw new Error(`Dependency installation error: ${error.message}`);
    }
  }

  /**
   * Generate README.md for validation
   */
  generateReadme(projectPath: string): void {
    const readmeContent = `# Spanwright Development Testbed

This is an automatically generated testbed project for Spanwright development and testing.

## 🚀 Quick Start

\`\`\`bash
# Initialize the project
make init

# Run all E2E scenarios
make run-all-scenarios

# Run individual scenario
make setup-scenario SCENARIO=example-01-basic-setup
make validate-scenario SCENARIO=example-01-basic-setup
make test-e2e-scenario SCENARIO=example-01-basic-setup
\`\`\`

## 📁 Generated Files

- **Schemas**: \`test-schemas/\` - Test database schemas
- **Seed Data**: \`scenarios/example-01-basic-setup/seed-data/\` - Test data
- **Configuration**: \`.env\` - Environment configuration

## 🧪 Test Data

### Primary DB
- Companies table with test company
- Users table with test user (email: e2e-test-user@example.com)

### Secondary DB  
- SystemConfig table with configuration
- Analytics and audit log tables (empty by default)

## 🔧 Development

This testbed is automatically regenerated by:
\`\`\`bash
npm run dev:create-testbed
\`\`\`

## 📊 Schema Details

### Primary DB Schema
- Companies (company management)
- Users (user authentication)
- UserSessions (session management)

### Secondary DB Schema
- UserAnalytics (user behavior tracking)
- SystemConfig (application configuration)
- AuditLogs (audit trail)

---
*Generated by Spanwright testbed creation script*
`;
    
    fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent);
  }

  /**
   * Main execution function
   */
  async run(): Promise<boolean> {
    try {
      // 1. Cleanup
      this.cleanup();
      
      // 2. Create testbed directory
      fs.mkdirSync(TESTBED_DIR, { recursive: true });
      
      // 3. Create test schema files
      const schemaPaths = this.createTestSchemas();
      
      // 4. Create Spanwright project
      const projectPath = await this.createSpanwrightProject(schemaPaths);
      
      // 5. Generate test data
      this.generateTestData(projectPath);
      
      // 6. Install dependencies
      await this.installDependencies(projectPath);
      
      // 7. Generate README
      this.generateReadme(projectPath);
      
      // Success message
      this.log('='.repeat(60));
      this.log('🎉 Testbed creation completed successfully!');
      this.log('='.repeat(60));
      this.log(`📁 Project path: ${projectPath}`);
      this.log('');
      this.log('🚀 Next steps:');
      this.log(`  cd ${path.relative(process.cwd(), projectPath)}`);
      this.log('  make init                    # Initial setup');
      this.log('  make run-all-scenarios       # Run all scenarios');
      this.log('');
      this.log('🧪 Individual tests:');
      this.log('  make setup-scenario SCENARIO=example-01-basic-setup');
      this.log('  make validate-scenario SCENARIO=example-01-basic-setup');
      this.log('  make test-e2e-scenario SCENARIO=example-01-basic-setup');
      
      return true;
      
    } catch (error: any) {
      this.log(`Testbed creation error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Script execution
if (require.main === module) {
  const creator = new TestbedCreator();
  creator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export default TestbedCreator;