#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';

/**
 * Examples creation script
 * Creates two example Spanwright projects: single-table and two-tables
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');

interface ExampleConfig {
  name: string;
  dbCount: number;
  schemaPaths: {
    primarySchemaPath: string;
    secondarySchemaPath?: string;
  };
}

class ExamplesCreator {
  constructor() {
    this.log('Starting Spanwright examples creation...');
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

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      password += chars[randomIndex];
    }

    return password;
  }

  /**
   * Clean up existing examples
   */
  cleanup(): void {
    const singleTableProject = path.join(EXAMPLES_DIR, 'single-table');
    const twoDatabasesProject = path.join(EXAMPLES_DIR, 'two-databases');

    // Remove existing projects but keep schemas and README files
    [singleTableProject, twoDatabasesProject].forEach(projectPath => {
      const filesToKeep = ['schemas', 'README.md'];
      if (fs.existsSync(projectPath)) {
        const items = fs.readdirSync(projectPath);
        items.forEach(item => {
          if (!filesToKeep.includes(item)) {
            const itemPath = path.join(projectPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
          }
        });
      }
    });

    this.log('Cleaned up existing example projects');
  }

  /**
   * Create example project
   */
  async createExampleProject(config: ExampleConfig): Promise<string> {
    this.log(`Creating ${config.name} example...`);

    try {
      // Build CLI first
      this.log('Building CLI...');
      execFileSync('npm', ['run', 'build'], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });

      const projectPath = path.join(EXAMPLES_DIR, config.name);

      // Copy template files
      const templateDir = path.join(PROJECT_ROOT, 'template');
      this.copyDirectory(templateDir, projectPath, config.name);

      // Generate configuration files
      this.generateConfigFiles(projectPath, config);

      // Generate test data
      this.generateTestData(projectPath, config);

      this.log(`${config.name} example created successfully`);
      return projectPath;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${config.name} example creation error: ${message}`);
    }
  }

  /**
   * Recursively copy directory
   */
  private copyDirectory(src: string, dest: string, projectName: string): void {
    // Skip if destination has schemas or README.md (preserve user files)
    if (fs.existsSync(dest) && (
      fs.existsSync(path.join(dest, 'schemas')) ||
      fs.existsSync(path.join(dest, 'README.md'))
    )) {
      // Only copy if destination doesn't exist or is empty
      if (!fs.existsSync(dest) || fs.readdirSync(dest).length === 0) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
      }
    } else {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
    }

    const items = fs.readdirSync(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath, projectName);
      } else {
        // Skip if destination file exists and is schemas or README
        if (fs.existsSync(destPath) && (
          destPath.includes('schemas') ||
          destPath.endsWith('README.md')
        )) {
          continue;
        }

        // Copy file
        fs.copyFileSync(srcPath, destPath);

        // Replace PROJECT_NAME in Go files
        if (item.endsWith('.go')) {
          this.replaceInFile(destPath, {
            PROJECT_NAME: projectName,
          });
        }

        // Handle template files
        if (item === 'go.mod.template') {
          this.replaceInFile(destPath, {
            PROJECT_NAME: projectName,
          });
          fs.renameSync(destPath, path.join(path.dirname(destPath), 'go.mod'));
        } else if (item === '_package.json') {
          fs.renameSync(destPath, path.join(path.dirname(destPath), 'package.json'));
        } else if (item === '_gitignore') {
          fs.renameSync(destPath, path.join(path.dirname(destPath), '.gitignore'));
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
  private generateConfigFiles(projectPath: string, config: ExampleConfig): void {
    this.log(`Generating configuration files for ${config.name}...`);

    // .env file
    const envContent = config.dbCount === 1 ? 
      this.generateSingleDbEnv(config) : 
      this.generateTwoDbEnv(config);

    fs.writeFileSync(path.join(projectPath, '.env'), envContent);

    // Handle template files
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(path.join(projectPath, '_package.json'))) {
      fs.renameSync(path.join(projectPath, '_package.json'), packageJsonPath);
    }

    const gitignorePath = path.join(projectPath, '.gitignore');
    if (fs.existsSync(path.join(projectPath, '_gitignore'))) {
      fs.renameSync(path.join(projectPath, '_gitignore'), gitignorePath);
    }

    // Convert go.mod.template to go.mod
    const goModPath = path.join(projectPath, 'go.mod');
    if (fs.existsSync(path.join(projectPath, 'go.mod.template'))) {
      let goModContent = fs.readFileSync(path.join(projectPath, 'go.mod.template'), 'utf8');
      goModContent = goModContent.replace(/PROJECT_NAME/g, config.name);
      fs.writeFileSync(goModPath, goModContent);
      fs.unlinkSync(path.join(projectPath, 'go.mod.template'));
    }

    this.log(`Configuration files generated for ${config.name}`);
  }

  private generateSingleDbEnv(config: ExampleConfig): string {
    return `# ================================================
# Spanwright Single Table Example Configuration
# ================================================

# 🔧 Database Settings
DB_COUNT=1
PRIMARY_DB_ID=primary-db
PRIMARY_DB_SCHEMA_PATH=${config.schemaPaths.primarySchemaPath}

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
PRIMARY_SCHEMA_PATH=${config.schemaPaths.primarySchemaPath}
SPANNER_EMULATOR_HOST=localhost:9010
`;
  }

  private generateTwoDbEnv(config: ExampleConfig): string {
    return `# ================================================
# Spanwright Two Databases Example Configuration
# ================================================

# 🔧 Database Settings
DB_COUNT=2
PRIMARY_DB_ID=primary-db
PRIMARY_DB_SCHEMA_PATH=${config.schemaPaths.primarySchemaPath}
SECONDARY_DB_ID=secondary-db
SECONDARY_DB_SCHEMA_PATH=${config.schemaPaths.secondarySchemaPath}

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
PRIMARY_SCHEMA_PATH=${config.schemaPaths.primarySchemaPath}
SECONDARY_SCHEMA_PATH=${config.schemaPaths.secondarySchemaPath}
SPANNER_EMULATOR_HOST=localhost:9010
`;
  }

  /**
   * Generate test data
   */
  private generateTestData(projectPath: string, config: ExampleConfig): void {
    this.log(`Generating test data for ${config.name}...`);

    // Rename scenario directory
    const oldScenarioDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup');
    const newScenarioDir = path.join(projectPath, 'scenarios', 'scenario-01-basic-setup');

    if (fs.existsSync(oldScenarioDir)) {
      fs.renameSync(oldScenarioDir, newScenarioDir);
    }

    const scenarioDir = path.join(newScenarioDir, 'seed-data');

    if (config.dbCount === 1) {
      this.generateSingleTableData(scenarioDir);
    } else {
      this.generateTwoTablesData(scenarioDir);
    }

    this.log(`Test data generated for ${config.name}`);
  }

  private generateSingleTableData(scenarioDir: string): void {
    const primarySeedData = {
      Users: [
        {
          UserID: 'user-001',
          Name: 'Alice Johnson',
          Email: 'alice@example.com',
          Status: 1,
          CreatedAt: '2024-01-01T10:00:00Z',
        },
        {
          UserID: 'user-002',
          Name: 'Bob Smith',
          Email: 'bob@example.com',
          Status: 1,
          CreatedAt: '2024-01-02T10:00:00Z',
        },
        {
          UserID: 'user-003',
          Name: 'Charlie Brown',
          Email: 'charlie@example.com',
          Status: 0,
          CreatedAt: '2024-01-03T10:00:00Z',
        },
      ],
    };

    fs.writeFileSync(
      path.join(scenarioDir, 'primary-seed.json'),
      JSON.stringify(primarySeedData, null, 2)
    );
  }

  private generateTwoTablesData(scenarioDir: string): void {
    const primarySeedData = {
      Users: [
        {
          UserID: 'user-001',
          Name: 'Alice Johnson',
          Email: 'alice@example.com',
          Status: 1,
          CreatedAt: '2024-01-01T10:00:00Z',
        },
        {
          UserID: 'user-002',
          Name: 'Bob Smith',
          Email: 'bob@example.com',
          Status: 1,
          CreatedAt: '2024-01-02T10:00:00Z',
        },
      ],
    };

    const secondarySeedData = {
      Logs: [
        {
          LogID: 'log-001',
          UserID: 'user-001',
          Action: 'login',
          IpAddress: '192.168.1.100',
          CreatedAt: '2024-01-01T10:05:00Z',
        },
        {
          LogID: 'log-002',
          UserID: 'user-001',
          Action: 'view_profile',
          IpAddress: '192.168.1.100',
          CreatedAt: '2024-01-01T10:10:00Z',
        },
        {
          LogID: 'log-003',
          UserID: 'user-002',
          Action: 'login',
          IpAddress: '192.168.1.101',
          CreatedAt: '2024-01-02T10:05:00Z',
        },
        {
          LogID: 'log-004',
          UserID: 'user-002',
          Action: 'logout',
          IpAddress: '192.168.1.101',
          CreatedAt: '2024-01-02T10:30:00Z',
        },
      ],
    };

    fs.writeFileSync(
      path.join(scenarioDir, 'primary-seed.json'),
      JSON.stringify(primarySeedData, null, 2)
    );

    fs.writeFileSync(
      path.join(scenarioDir, 'secondary-seed.json'),
      JSON.stringify(secondarySeedData, null, 2)
    );
  }

  /**
   * Install dependencies
   */
  async installDependencies(projectPath: string): Promise<void> {
    this.log(`Installing dependencies for ${path.basename(projectPath)}...`);

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

      this.log(`Dependencies installed for ${path.basename(projectPath)}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Dependency installation error: ${message}`);
    }
  }

  /**
   * Main execution function
   */
  async run(): Promise<boolean> {
    try {
      // Define example configurations
      const examples: ExampleConfig[] = [
        {
          name: 'single-table',
          dbCount: 1,
          schemaPaths: {
            primarySchemaPath: path.join(EXAMPLES_DIR, 'single-table', 'schemas', 'primary-db'),
          },
        },
        {
          name: 'two-databases',
          dbCount: 2,
          schemaPaths: {
            primarySchemaPath: path.join(EXAMPLES_DIR, 'two-databases', 'schemas', 'primary-db'),
            secondarySchemaPath: path.join(EXAMPLES_DIR, 'two-databases', 'schemas', 'secondary-db'),
          },
        },
      ];

      // 1. Cleanup existing projects
      this.cleanup();

      // 2. Create examples
      for (const config of examples) {
        const projectPath = await this.createExampleProject(config);
        await this.installDependencies(projectPath);
      }

      // Success message
      this.log('='.repeat(60));
      this.log('🎉 Examples creation completed successfully!');
      this.log('='.repeat(60));
      this.log('📁 Created examples:');
      this.log('  - examples/single-table/');
      this.log('  - examples/two-databases/');
      this.log('');
      this.log('🚀 Try the examples:');
      this.log('  cd examples/single-table && make run-all-scenarios');
      this.log('  cd examples/two-databases && make run-all-scenarios');

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Examples creation error: ${message}`, 'error');
      return false;
    }
  }
}

// Script execution
if (process.argv[1] === __filename) {
  const creator = new ExamplesCreator();
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

export default ExamplesCreator;