// Application constants
export const APP_NAME = 'Spanwright';
export const APP_DESCRIPTION = 'Cloud Spanner E2E Testing Framework Generator';
export const GITHUB_URL = 'https://github.com/nu0ma/spanwright';

// CLI flags
export const CLI_FLAGS = {
  VERSION: ['--version', '-v'],
  HELP: ['--help', '-h'],
  NON_INTERACTIVE: '--non-interactive'
} as const;

// Environment variables
export const ENV_VARS = {
  CI: 'CI',
  NON_INTERACTIVE: 'SPANWRIGHT_NON_INTERACTIVE',
  DB_COUNT: 'SPANWRIGHT_DB_COUNT',
  PRIMARY_DB_NAME: 'SPANWRIGHT_PRIMARY_DB_NAME',
  PRIMARY_SCHEMA_PATH: 'SPANWRIGHT_PRIMARY_SCHEMA_PATH',
  SECONDARY_DB_NAME: 'SPANWRIGHT_SECONDARY_DB_NAME',
  SECONDARY_SCHEMA_PATH: 'SPANWRIGHT_SECONDARY_SCHEMA_PATH'
} as const;

// Default values
export const DEFAULTS = {
  DB_COUNT: '1' as const,
  PRIMARY_DB_NAME: 'primary-db',
  PRIMARY_SCHEMA_PATH: './schema',
  SECONDARY_DB_NAME: 'secondary-db',
  SECONDARY_SCHEMA_PATH: './schema2',
  PROJECT_ID: 'test-project',
  INSTANCE_ID: 'test-instance',
  DOCKER_IMAGE: 'gcr.io/cloud-spanner-emulator/emulator',
  CONTAINER_NAME: 'spanner-emulator',
  SPANNER_PORT: '9010',
  ADMIN_PORT: '9020',
  STARTUP_WAIT: '20'
} as const;

// File patterns
export const FILE_PATTERNS = {
  GO_EXTENSION: '.go',
  PACKAGE_JSON_TEMPLATE: '_package.json',
  GITIGNORE_TEMPLATE: '_gitignore',
  GO_MOD_TEMPLATE: 'go.mod.template',
  PACKAGE_JSON: 'package.json',
  GITIGNORE: '.gitignore',
  GO_MOD: 'go.mod',
  ENV: '.env'
} as const;

// Template replacements
export const TEMPLATE_VARS = {
  PROJECT_NAME: 'PROJECT_NAME'
} as const;

// Validation patterns
export const VALIDATION = {
  DB_COUNTS: ['1', '2'] as const,
  FLAG_PREFIX: '-'
} as const;

// Messages
export const MESSAGES = {
  ERRORS: {
    NO_PROJECT_NAME: '❌ Please specify a project name',
    DIRECTORY_EXISTS: (name: string) => `❌ Directory "${name}" already exists`,
    INVALID_DB_COUNT: '❌ Please enter 1 or 2',
    ENV_DB_COUNT_INVALID: '❌ SPANWRIGHT_DB_COUNT must be 1 or 2'
  },
  INFO: {
    STARTING_SETUP: '🚀 Starting Spanner E2E Test Framework setup',
    CREATING_DIRECTORY: '📁 Creating project directory...',
    COPYING_TEMPLATES: '📦 Copying template files...',
    CONFIGURING_GO: '🔧 Configuring Go modules...',
    CREATING_ENV: '⚙️  Creating environment configuration file...',
    REMOVING_FILES: '🗑️  Removing unnecessary files (Single DB configuration)...',
    COMPLETED: '✅ Project creation completed!'
  },
  USAGE: {
    BASIC: 'Usage: npx spanwright my-project',
    HELP_SUGGESTION: 'Try "spanwright --help" for more information.'
  }
} as const;
