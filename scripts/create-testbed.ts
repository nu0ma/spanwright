#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';

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
   * Generate a secure random password for test environment
   */
  private generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const length = 16;
    let password = '';

    // Use crypto for secure random generation
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }

    return password;
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

    // Primary DB schema - E-commerce tables to match template seed data
    const primarySchema = `-- Primary Database Schema for E-commerce E2E Testing
-- Users table
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);

-- Products table
CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  IsActive BOOL NOT NULL
) PRIMARY KEY (ProductID);

-- Orders table
CREATE TABLE Orders (
  OrderID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  TotalAmount INT64 NOT NULL,
  Status STRING(50) NOT NULL,
  OrderDate TIMESTAMP NOT NULL
) PRIMARY KEY (OrderID);

-- OrderItems table
CREATE TABLE OrderItems (
  OrderItemID STRING(36) NOT NULL,
  OrderID STRING(36) NOT NULL,
  ProductID STRING(36) NOT NULL,
  Quantity INT64 NOT NULL,
  UnitPrice INT64 NOT NULL
) PRIMARY KEY (OrderItemID);
`;

    // Secondary DB schema - Analytics tables to match template expected data
    const secondarySchema = `-- Secondary Database Schema for Analytics E2E Testing
-- Analytics table
CREATE TABLE Analytics (
  AnalyticsID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  EventType STRING(100) NOT NULL,
  PageURL STRING(500),
  Timestamp TIMESTAMP NOT NULL
) PRIMARY KEY (AnalyticsID);

-- UserLogs table
CREATE TABLE UserLogs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(255) NOT NULL,
  IpAddress STRING(50),
  UserAgent STRING(500),
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (LogID);
`;

    // Write schema files
    fs.writeFileSync(path.join(primarySchemaDir, '001_initial_schema.sql'), primarySchema);
    fs.writeFileSync(path.join(secondarySchemaDir, '001_initial_schema.sql'), secondarySchema);

    this.log('Test schema files created successfully');

    return {
      primarySchemaPath: primarySchemaDir,
      secondarySchemaPath: secondarySchemaDir,
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
      execFileSync('npm', ['run', 'build'], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Project creation error: ${message}`);
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
        // Copy file
        fs.copyFileSync(srcPath, destPath);

        // Replace PROJECT_NAME in Go files
        if (item.endsWith('.go')) {
          this.replaceInFile(destPath, {
            PROJECT_NAME: TESTBED_PROJECT_NAME,
          });
        }

        // Handle template files
        if (item === 'go.mod.template') {
          this.replaceInFile(destPath, {
            PROJECT_NAME: TESTBED_PROJECT_NAME,
          });
          fs.renameSync(destPath, path.join(dest, 'go.mod'));
        } else if (item === '_package.json') {
          fs.renameSync(destPath, path.join(dest, 'package.json'));
        } else if (item === '_gitignore') {
          fs.renameSync(destPath, path.join(dest, '.gitignore'));
        }
      }
    }
  }

  /**
   * Replace content in file
   */
  private replaceInFile(filePath: string, replacements: Record<string, string>): void {
    let content = fs.readFileSync(filePath, 'utf8');

    Object.entries(replacements).forEach(([search, replace]) => {
      content = content.replace(new RegExp(search, 'g'), replace);
    });

    fs.writeFileSync(filePath, content, 'utf8');
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
TEST_ACCOUNT_PASSWORD=${this.generateSecurePassword()}

# Environment variables expected by Go tools
PRIMARY_DATABASE_ID=primary-db
SECONDARY_DATABASE_ID=secondary-db
PRIMARY_SCHEMA_PATH=${schemaPaths.primarySchemaPath}
SECONDARY_SCHEMA_PATH=${schemaPaths.secondarySchemaPath}
SPANNER_EMULATOR_HOST=localhost:9010
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

    // Rename scenario directory to match expected pattern
    const oldScenarioDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup');
    const newScenarioDir = path.join(projectPath, 'scenarios', 'scenario-01-basic-setup');

    if (fs.existsSync(oldScenarioDir)) {
      fs.renameSync(oldScenarioDir, newScenarioDir);
    }

    const scenarioDir = path.join(newScenarioDir, 'seed-data');

    // Primary DB test data - matches template expected data
    const primarySeedData = {
      Users: [
        {
          UserID: 'user-001',
          Name: 'Sample User',
          Email: 'user@example.com',
          Status: 1,
          CreatedAt: '2024-01-01T00:00:00Z',
        },
        {
          UserID: 'user-002',
          Name: 'Test User',
          Email: 'test@example.com',
          Status: 1,
          CreatedAt: '2024-01-02T00:00:00Z',
        },
      ],
      Products: [
        {
          ProductID: 'prod-001',
          Name: 'Sample Product',
          Price: 1000,
          CategoryID: 'cat-001',
          IsActive: true,
        },
        {
          ProductID: 'prod-002',
          Name: 'Test Product',
          Price: 1500,
          CategoryID: 'cat-001',
          IsActive: true,
        },
        {
          ProductID: 'prod-003',
          Name: 'Demo Product',
          Price: 500,
          CategoryID: 'cat-002',
          IsActive: false,
        },
      ],
      Orders: [
        {
          OrderID: 'order-001',
          UserID: 'user-001',
          TotalAmount: 2500,
          Status: 'completed',
          OrderDate: '2024-01-15T10:30:00Z',
        },
      ],
      OrderItems: [
        {
          OrderItemID: 'item-001',
          OrderID: 'order-001',
          ProductID: 'prod-001',
          Quantity: 2,
          UnitPrice: 1000,
        },
        {
          OrderItemID: 'item-002',
          OrderID: 'order-001',
          ProductID: 'prod-002',
          Quantity: 1,
          UnitPrice: 500,
        },
      ],
    };

    // Secondary DB test data - matches template expected data
    const secondarySeedData = {
      Analytics: [
        {
          AnalyticsID: 'analytics-001',
          UserID: 'user-001',
          EventType: 'page_view',
          PageURL: '/products',
          Timestamp: '2024-01-15T10:30:00Z',
        },
        {
          AnalyticsID: 'analytics-002',
          UserID: 'user-001',
          EventType: 'page_view',
          PageURL: '/cart',
          Timestamp: '2024-01-15T10:31:00Z',
        },
        {
          AnalyticsID: 'analytics-003',
          UserID: 'user-002',
          EventType: 'page_view',
          PageURL: '/home',
          Timestamp: '2024-01-15T11:00:00Z',
        },
        {
          AnalyticsID: 'analytics-004',
          UserID: 'user-002',
          EventType: 'click',
          PageURL: '/products',
          Timestamp: '2024-01-15T11:01:00Z',
        },
        {
          AnalyticsID: 'analytics-005',
          UserID: 'user-001',
          EventType: 'purchase',
          PageURL: '/checkout',
          Timestamp: '2024-01-15T10:35:00Z',
        },
      ],
      UserLogs: [
        {
          LogID: 'log-001',
          UserID: 'user-001',
          Action: 'login',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T09:00:00Z',
        },
        {
          LogID: 'log-002',
          UserID: 'user-001',
          Action: 'view_product',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T09:05:00Z',
        },
        {
          LogID: 'log-003',
          UserID: 'user-002',
          Action: 'login',
          IpAddress: '192.168.1.2',
          UserAgent: 'Chrome/120.0',
          CreatedAt: '2024-01-15T09:30:00Z',
        },
        {
          LogID: 'log-004',
          UserID: 'user-001',
          Action: 'add_to_cart',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T09:10:00Z',
        },
        {
          LogID: 'log-005',
          UserID: 'user-001',
          Action: 'checkout',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T09:15:00Z',
        },
        {
          LogID: 'log-006',
          UserID: 'user-002',
          Action: 'view_product',
          IpAddress: '192.168.1.2',
          UserAgent: 'Chrome/120.0',
          CreatedAt: '2024-01-15T09:35:00Z',
        },
        {
          LogID: 'log-007',
          UserID: 'user-001',
          Action: 'logout',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T10:00:00Z',
        },
        {
          LogID: 'log-008',
          UserID: 'user-002',
          Action: 'add_to_cart',
          IpAddress: '192.168.1.2',
          UserAgent: 'Chrome/120.0',
          CreatedAt: '2024-01-15T09:40:00Z',
        },
        {
          LogID: 'log-009',
          UserID: 'user-001',
          Action: 'login',
          IpAddress: '192.168.1.1',
          UserAgent: 'Mozilla/5.0',
          CreatedAt: '2024-01-15T10:25:00Z',
        },
        {
          LogID: 'log-010',
          UserID: 'user-002',
          Action: 'logout',
          IpAddress: '192.168.1.2',
          UserAgent: 'Chrome/120.0',
          CreatedAt: '2024-01-15T10:30:00Z',
        },
      ],
    };

    // Convert primary data to SQL
    const primarySQL = this.generatePrimarySeedSQL(primarySeedData);
    fs.writeFileSync(
      path.join(scenarioDir, 'primary-seed.sql'),
      primarySQL
    );

    // Convert secondary data to SQL
    const secondarySQL = this.generateSecondarySeedSQL(secondarySeedData);
    fs.writeFileSync(
      path.join(scenarioDir, 'secondary-seed.sql'),
      secondarySQL
    );

    this.log('Test data generated successfully');
  }

  /**
   * Generate SQL for primary database seed data
   */
  private generatePrimarySeedSQL(data: Record<string, unknown[]>): string {
    const statements: string[] = [
      '-- Primary database seed data',
      '-- Insert Users'
    ];

    // Generate Users INSERT statements
    if (data.Users && data.Users.length > 0) {
      const userValues = data.Users.map((user: Record<string, unknown>) => 
        `  ('${user.UserID}', '${user.Name}', '${user.Email}', ${user.Status}, '${user.CreatedAt}')`
      ).join(',\n');
      statements.push(`INSERT INTO Users (UserID, Name, Email, Status, CreatedAt) VALUES\n${userValues};`);
    }

    // Generate Products INSERT statements
    if (data.Products && data.Products.length > 0) {
      statements.push('\n-- Insert Products');
      const productValues = data.Products.map((product: Record<string, unknown>) => 
        `  ('${product.ProductID}', '${product.Name}', ${product.Price}, '${product.CategoryID}', ${product.IsActive})`
      ).join(',\n');
      statements.push(`INSERT INTO Products (ProductID, Name, Price, CategoryID, IsActive) VALUES\n${productValues};`);
    }

    // Generate Orders INSERT statements
    if (data.Orders && data.Orders.length > 0) {
      statements.push('\n-- Insert Orders');
      const orderValues = data.Orders.map((order: Record<string, unknown>) => 
        `  ('${order.OrderID}', '${order.UserID}', ${order.TotalAmount}, '${order.Status}', '${order.OrderDate}')`
      ).join(',\n');
      statements.push(`INSERT INTO Orders (OrderID, UserID, TotalAmount, Status, OrderDate) VALUES\n${orderValues};`);
    }

    // Generate OrderItems INSERT statements
    if (data.OrderItems && data.OrderItems.length > 0) {
      statements.push('\n-- Insert OrderItems');
      const orderItemValues = data.OrderItems.map((item: Record<string, unknown>) => 
        `  ('${item.OrderItemID}', '${item.OrderID}', '${item.ProductID}', ${item.Quantity}, ${item.UnitPrice})`
      ).join(',\n');
      statements.push(`INSERT INTO OrderItems (OrderItemID, OrderID, ProductID, Quantity, UnitPrice) VALUES\n${orderItemValues};`);
    }

    return statements.join('\n');
  }

  /**
   * Generate SQL for secondary database seed data
   */
  private generateSecondarySeedSQL(data: Record<string, unknown[]>): string {
    const statements: string[] = [
      '-- Secondary database seed data',
      '-- Insert Analytics'
    ];

    // Generate Analytics INSERT statements
    if (data.Analytics && data.Analytics.length > 0) {
      const analyticsValues = data.Analytics.map((analytics: Record<string, unknown>) => 
        `  ('${analytics.AnalyticsID}', '${analytics.UserID}', '${analytics.EventType}', '${analytics.PageURL}', '${analytics.Timestamp}')`
      ).join(',\n');
      statements.push(`INSERT INTO Analytics (AnalyticsID, UserID, EventType, PageURL, Timestamp) VALUES\n${analyticsValues};`);
    }

    // Generate UserLogs INSERT statements
    if (data.UserLogs && data.UserLogs.length > 0) {
      statements.push('\n-- Insert UserLogs');
      const userLogValues = data.UserLogs.map((log: Record<string, unknown>) => 
        `  ('${log.LogID}', '${log.UserID}', '${log.Action}', '${log.IpAddress}', '${log.UserAgent}', '${log.CreatedAt}')`
      ).join(',\n');
      statements.push(`INSERT INTO UserLogs (LogID, UserID, Action, IpAddress, UserAgent, CreatedAt) VALUES\n${userLogValues};`);
    }

    return statements.join('\n');
  }

  /**
   * Install dependencies
   */
  async installDependencies(projectPath: string): Promise<void> {
    this.log('Installing dependencies...');

    try {
      // npm install
      execFileSync('npm', ['install'], {
        cwd: projectPath,
        stdio: 'inherit',
      });

      // go mod tidy
      execFileSync('go', ['mod', 'tidy'], {
        cwd: projectPath,
        stdio: 'inherit',
      });

      this.log('Dependencies installed successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Dependency installation error: ${message}`);
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
- Users table with 2 test users
- Products table with 3 products
- Orders table with 1 order
- OrderItems table with 2 items

### Secondary DB  
- Analytics table with 5 page view/click events
- UserLogs table with 10 user action logs

## 🔧 Development

This testbed is automatically regenerated by:
\`\`\`bash
npm run dev:create-testbed
\`\`\`

## 📊 Schema Details

### Primary DB Schema
- Users (user accounts)
- Products (product catalog)
- Orders (order management)
- OrderItems (order line items)

### Secondary DB Schema
- Analytics (page views and user events)
- UserLogs (user action history)

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Testbed creation error: ${message}`, 'error');
      return false;
    }
  }
}

// Script execution
if (process.argv[1] === __filename) {
  const creator = new TestbedCreator();
  creator
    .run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export default TestbedCreator;
