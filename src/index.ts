#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface DatabaseConfig {
  count: '1' | '2';
  primaryDbName: string;
  primarySchemaPath: string;
  secondaryDbName?: string;
  secondarySchemaPath?: string;
}

// Helper function to show version
function showVersion(): void {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(packageJson.version);
  process.exit(0);
}

// Helper function to show help
function showHelp(): void {
  console.log(`Spanwright - Cloud Spanner E2E Testing Framework Generator

Usage: spanwright [options] <project-name>

Options:
  -v, --version    Show version number
  -h, --help       Show help information

Arguments:
  project-name     Name of the project to create

Examples:
  spanwright my-project              Create a new project interactively
  spanwright my-project --non-interactive   Create with default settings

Non-interactive mode environment variables:
  SPANWRIGHT_DB_COUNT              Number of databases (1 or 2, default: 1)
  SPANWRIGHT_PRIMARY_DB_NAME       Primary database name (default: primary-db)
  SPANWRIGHT_PRIMARY_SCHEMA_PATH   Primary database schema path (default: /tmp/schema)
  SPANWRIGHT_SECONDARY_DB_NAME     Secondary database name (default: secondary-db)
  SPANWRIGHT_SECONDARY_SCHEMA_PATH Secondary database schema path (default: /tmp/schema2)

For more information, visit: https://github.com/nu0ma/spanwright
`);
  process.exit(0);
}

// Parse command-line flags
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  showVersion();
}
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
}

// Get project name (excluding flags)
const projectNameArg = args.find(arg => !arg.startsWith('-'));

if (!projectNameArg) {
  console.error('❌ Please specify a project name');
  console.log('Usage: npx spanwright my-project');
  console.log('Try "spanwright --help" for more information.');
  process.exit(1);
}

// TypeScript now knows projectName is defined
const projectName: string = projectNameArg;

// Create project directory
const projectPath = path.resolve(process.cwd(), projectName);

if (fs.existsSync(projectPath)) {
  console.error(`❌ Directory "${projectName}" already exists`);
  process.exit(1);
}

// Configure readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function for questions
function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Helper function for file copying
function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replace file contents
function replaceInFile(filePath: string, replacements: Record<string, string>): void {
  let content = fs.readFileSync(filePath, 'utf8');

  Object.entries(replacements).forEach(([search, replace]) => {
    const escapedSearch = escapeRegExp(search);
    content = content.replace(new RegExp(escapedSearch, 'g'), replace);
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

// Check for non-interactive mode
function isNonInteractive(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.SPANWRIGHT_NON_INTERACTIVE === 'true' ||
    args.includes('--non-interactive')
  );
}

// Get configuration from environment variables or interactive input
async function getConfiguration(): Promise<DatabaseConfig> {
  if (isNonInteractive()) {
    // Non-interactive mode - use environment variables with defaults
    const dbCount = process.env.SPANWRIGHT_DB_COUNT || '1';
    const primaryDbName = process.env.SPANWRIGHT_PRIMARY_DB_NAME || 'primary-db';
    const primarySchemaPath = process.env.SPANWRIGHT_PRIMARY_SCHEMA_PATH || '/tmp/schema';
    const secondaryDbName = process.env.SPANWRIGHT_SECONDARY_DB_NAME || 'secondary-db';
    const secondarySchemaPath = process.env.SPANWRIGHT_SECONDARY_SCHEMA_PATH || '/tmp/schema2';

    if (dbCount !== '1' && dbCount !== '2') {
      console.error('❌ SPANWRIGHT_DB_COUNT must be 1 or 2');
      process.exit(1);
    }

    console.log(`🤖 Non-interactive mode: Creating project with ${dbCount} database(s)`);
    console.log(`   Primary DB: ${primaryDbName} (${primarySchemaPath})`);
    if (dbCount === '2') {
      console.log(`   Secondary DB: ${secondaryDbName} (${secondarySchemaPath})`);
    }

    return {
      count: dbCount as '1' | '2',
      primaryDbName,
      primarySchemaPath,
      secondaryDbName: dbCount === '2' ? secondaryDbName : undefined,
      secondarySchemaPath: dbCount === '2' ? secondarySchemaPath : undefined,
    };
  } else {
    // Interactive mode - ask questions
    return await getInteractiveConfiguration();
  }
}

async function getInteractiveConfiguration(): Promise<DatabaseConfig> {
  // Select number of databases
  const dbCount = await question('Select number of databases (1 or 2): ');

  if (dbCount !== '1' && dbCount !== '2') {
    console.error('❌ Please enter 1 or 2');
    process.exit(1);
  }

  // Get DB configuration
  const primaryDbName = (await question('Primary DB name (default: primary-db): ')) || 'primary-db';
  const primarySchemaPath = await question('Primary DB schema path: ');

  const config: DatabaseConfig = {
    count: dbCount as '1' | '2',
    primaryDbName,
    primarySchemaPath,
  };

  if (dbCount === '2') {
    config.secondaryDbName =
      (await question('Secondary DB name (default: secondary-db): ')) || 'secondary-db';
    config.secondarySchemaPath = await question('Secondary DB schema path: ');
  }

  return config;
}

// Main process
async function main(): Promise<void> {
  console.log('🚀 Starting Spanner E2E Test Framework setup');
  console.log('');

  try {
    const config = await getConfiguration();

    // Close readline interface if it was used
    if (!isNonInteractive()) {
      rl.close();
    }

    console.log('');
    console.log('📁 Creating project directory...');
    fs.mkdirSync(projectPath, { recursive: true });

    // Template directory path
    const templatePath = path.join(__dirname, '..', 'template');

    console.log('📦 Copying template files...');
    copyDir(templatePath, projectPath);

    // _package.json を package.json にリネーム
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(path.join(projectPath, '_package.json'))) {
      fs.renameSync(path.join(projectPath, '_package.json'), packageJsonPath);
    }

    // _gitignore を .gitignore にリネーム
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (fs.existsSync(path.join(projectPath, '_gitignore'))) {
      fs.renameSync(path.join(projectPath, '_gitignore'), gitignorePath);
    }

    // Generate go.mod dynamically
    const goModPath = path.join(projectPath, 'go.mod');
    if (fs.existsSync(path.join(projectPath, 'go.mod.template'))) {
      replaceInFile(path.join(projectPath, 'go.mod.template'), {
        PROJECT_NAME: projectName,
      });
      fs.renameSync(path.join(projectPath, 'go.mod.template'), goModPath);
    }

    // Replace PROJECT_NAME in all Go files
    console.log('🔧 Configuring Go modules...');
    const replaceInGoFiles = (dir: string) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          replaceInGoFiles(fullPath);
        } else if (item.endsWith('.go')) {
          replaceInFile(fullPath, {
            PROJECT_NAME: projectName,
          });
        }
      });
    };

    replaceInGoFiles(projectPath);

    // Configure .env.example
    console.log('⚙️  Creating environment configuration file...');
    const envExamplePath = path.join(projectPath, '.env.example');

    let envContent = `# ================================================
# Spanner E2E Testing Framework Configuration
# Copy this file to .env and adjust the settings
# ================================================

# 🔧 Database Settings
DB_COUNT=${config.count}
PRIMARY_DB_ID=${config.primaryDbName}
PRIMARY_DB_SCHEMA_PATH=${config.primarySchemaPath}
`;

    if (config.count === '2' && config.secondaryDbName && config.secondarySchemaPath) {
      envContent += `SECONDARY_DB_ID=${config.secondaryDbName}
SECONDARY_DB_SCHEMA_PATH=${config.secondarySchemaPath}
`;
    }

    envContent += `
# 📊 Project Settings (usually no need to change)
PROJECT_ID=test-project
INSTANCE_ID=test-instance

# 🐳 Docker Settings (usually no need to change)
DOCKER_IMAGE=gcr.io/cloud-spanner-emulator/emulator
DOCKER_CONTAINER_NAME=spanner-emulator
DOCKER_SPANNER_PORT=9010
DOCKER_ADMIN_PORT=9020
DOCKER_STARTUP_WAIT=20
`;

    fs.writeFileSync(envExamplePath, envContent, 'utf8');

    // Also create .env file for immediate use
    const envPath = path.join(projectPath, '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');

    // Remove unnecessary files based on DB count
    if (config.count === '1') {
      console.log('🗑️  Removing unnecessary files (Single DB configuration)...');
      const exampleDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup');

      // Remove Secondary DB related files
      const secondaryFiles = [
        path.join(exampleDir, 'expected-secondary.yaml'),
        path.join(exampleDir, 'seed-data', 'secondary-seed.json'),
      ];

      secondaryFiles.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }

    console.log('');
    console.log('✅ Project creation completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  make init           # Initial setup');
    console.log('  make run-all-examples  # Run samples');
    console.log('');
    console.log('🔧 Create new test scenario:');
    console.log('  make new-scenario SCENARIO=scenario-01-my-test');
    console.log('');
    console.log('📚 Detailed documentation: See README.md');
  } catch (error) {
    console.error('❌ An error occurred:', (error as Error).message);
    process.exit(1);
  }
}

main();
