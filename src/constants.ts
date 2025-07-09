// Application constants
export const APP_NAME = 'Spanwright';
export const APP_DESCRIPTION = 'Cloud Spanner E2E Testing Framework Generator';
export const GITHUB_URL = 'https://github.com/nu0ma/spanwright';

// CLI flags
export const CLI_FLAGS = {
  VERSION: ['--version', '-v'],
  HELP: ['--help', '-h'],
  NON_INTERACTIVE: '--non-interactive',
} as const;

// Environment variables
export const ENV_VARS = {
  CI: 'CI',
  NON_INTERACTIVE: 'SPANWRIGHT_NON_INTERACTIVE',
  DB_COUNT: 'SPANWRIGHT_DB_COUNT',
  PRIMARY_DB_NAME: 'SPANWRIGHT_PRIMARY_DB_NAME',
  PRIMARY_SCHEMA_PATH: 'SPANWRIGHT_PRIMARY_SCHEMA_PATH',
  SECONDARY_DB_NAME: 'SPANWRIGHT_SECONDARY_DB_NAME',
  SECONDARY_SCHEMA_PATH: 'SPANWRIGHT_SECONDARY_SCHEMA_PATH',
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
  STARTUP_WAIT: '20',
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
  ENV: '.env',
} as const;

// Template replacements
export const TEMPLATE_VARS = {
  PROJECT_NAME: 'PROJECT_NAME',
} as const;

// Validation patterns
export const VALIDATION = {
  DB_COUNTS: ['1', '2'] as const,
  FLAG_PREFIX: '-',
} as const;

// Security validation patterns
export const SECURITY_PATTERNS = {
  SAFE_PROJECT_NAME: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  SAFE_DATABASE_NAME: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  SAFE_SCHEMA_PATH: /^[a-zA-Z0-9_./\\-]+$/,
  SAFE_GENERIC_IDENTIFIER: /^[a-zA-Z0-9_-]+$/,
  DANGEROUS_KEYWORDS:
    /\b(exec|eval|process|require|import|delete|drop|insert|select|update|union|script|javascript|onload|onerror)\b/i,
  SQL_RESERVED_WORDS:
    /\b(select|insert|update|delete|drop|create|alter|table|database|schema|union|where|having|group|order|join|inner|outer|left|right|full|exists|in|like|between|and|or|not|null|is|as|distinct|all|any|some|case|when|then|else|end)\b/i,
} as const;

// Template context mappings
export const TEMPLATE_CONTEXTS = {
  JAVASCRIPT: 'javascript',
  SHELL: 'shell',
  SQL: 'sql',
  GENERIC: 'generic',
} as const;

// File extension to context mapping
export const FILE_CONTEXT_EXTENSIONS = {
  '.js': TEMPLATE_CONTEXTS.JAVASCRIPT,
  '.ts': TEMPLATE_CONTEXTS.JAVASCRIPT,
  '.jsx': TEMPLATE_CONTEXTS.JAVASCRIPT,
  '.tsx': TEMPLATE_CONTEXTS.JAVASCRIPT,
  '.sh': TEMPLATE_CONTEXTS.SHELL,
  '.bash': TEMPLATE_CONTEXTS.SHELL,
  '.zsh': TEMPLATE_CONTEXTS.SHELL,
  '.fish': TEMPLATE_CONTEXTS.SHELL,
  '.mk': TEMPLATE_CONTEXTS.SHELL,
  '.mak': TEMPLATE_CONTEXTS.SHELL,
  '.sql': TEMPLATE_CONTEXTS.SQL,
  '.ddl': TEMPLATE_CONTEXTS.SQL,
  '.dml': TEMPLATE_CONTEXTS.SQL,
  '.go': TEMPLATE_CONTEXTS.GENERIC,
  '.mod': TEMPLATE_CONTEXTS.GENERIC,
  '.json': TEMPLATE_CONTEXTS.GENERIC,
  '.yaml': TEMPLATE_CONTEXTS.GENERIC,
  '.yml': TEMPLATE_CONTEXTS.GENERIC,
  '.toml': TEMPLATE_CONTEXTS.GENERIC,
  '.md': TEMPLATE_CONTEXTS.GENERIC,
  '.txt': TEMPLATE_CONTEXTS.GENERIC,
} as const;

// Special filename mappings
export const SPECIAL_FILENAMES = {
  makefile: TEMPLATE_CONTEXTS.SHELL,
  Makefile: TEMPLATE_CONTEXTS.SHELL,
  'makefile.*': TEMPLATE_CONTEXTS.SHELL,
  'Makefile.*': TEMPLATE_CONTEXTS.SHELL,
} as const;

// Messages
export const MESSAGES = {
  ERRORS: {
    NO_PROJECT_NAME: '❌ Please specify a project name',
    DIRECTORY_EXISTS: (name: string) => `❌ Directory "${name}" already exists`,
    INVALID_DB_COUNT: '❌ Please enter 1 or 2',
    ENV_DB_COUNT_INVALID: '❌ SPANWRIGHT_DB_COUNT must be 1 or 2',
    TEMPLATE_SECURITY: '❌ Template security validation failed',
    INJECTION_ATTEMPT: '❌ Potential code injection detected',
    INVALID_CHARACTERS: '❌ Invalid characters detected in input',
    PATH_TRAVERSAL: '❌ Path traversal attempt detected',
    NULL_BYTE: '❌ Null byte injection attempt detected',
    INPUT_TOO_LONG: '❌ Input exceeds maximum length limit',
    DANGEROUS_KEYWORDS: '❌ Dangerous keywords detected in input',
  },
  INFO: {
    STARTING_SETUP: '🚀 Starting Spanner E2E Test Framework setup',
    CREATING_DIRECTORY: '📁 Creating project directory...',
    COPYING_TEMPLATES: '📦 Copying template files...',
    CONFIGURING_GO: '🔧 Configuring Go modules...',
    CREATING_ENV: '⚙️  Creating environment configuration file...',
    REMOVING_FILES: '🗑️  Removing unnecessary files (Single DB configuration)...',
    COMPLETED: '✅ Project creation completed!',
  },
  USAGE: {
    BASIC: 'Usage: npx spanwright my-project',
    HELP_SUGGESTION: 'Try "spanwright --help" for more information.',
  },
} as const;
