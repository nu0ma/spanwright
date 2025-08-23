import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  APP_DESCRIPTION,
  GITHUB_URL,
  CLI_FLAGS,
  ENV_VARS,
  DEFAULTS,
  FILE_PATTERNS,
  TEMPLATE_VARS,
  VALIDATION,
  MESSAGES,
} from '../constants';

describe('Constants Module', () => {
  describe('Application Constants', () => {
    it('should have correct app name', () => {
      expect(APP_NAME).toBe('Spanwright');
    });

    it('should have correct app description', () => {
      expect(APP_DESCRIPTION).toBe('Cloud Spanner E2E Testing Framework Generator');
    });

    it('should have correct GitHub URL', () => {
      expect(GITHUB_URL).toBe('https://github.com/nu0ma/spanwright');
    });
  });

  describe('CLI_FLAGS', () => {
    it('should have version flags', () => {
      expect(CLI_FLAGS.VERSION).toEqual(['--version', '-v']);
      expect(CLI_FLAGS.VERSION).toHaveLength(2);
    });

    it('should have help flags', () => {
      expect(CLI_FLAGS.HELP).toEqual(['--help', '-h']);
      expect(CLI_FLAGS.HELP).toHaveLength(2);
    });

    it('should have non-interactive flag', () => {
      expect(CLI_FLAGS.NON_INTERACTIVE).toBe('--non-interactive');
    });

    it('should be readonly', () => {
      expect(typeof CLI_FLAGS.VERSION).toBe('object');
      expect(Array.isArray(CLI_FLAGS.VERSION)).toBe(true);
    });
  });

  describe('ENV_VARS', () => {
    it('should have CI environment variable', () => {
      expect(ENV_VARS.CI).toBe('CI');
    });

    it('should have non-interactive environment variable', () => {
      expect(ENV_VARS.NON_INTERACTIVE).toBe('SPANWRIGHT_NON_INTERACTIVE');
    });

    it('should have database count environment variable', () => {
      expect(ENV_VARS.DB_COUNT).toBe('SPANWRIGHT_DB_COUNT');
    });

    it('should have primary database environment variables', () => {
      expect(ENV_VARS.PRIMARY_DB_NAME).toBe('SPANWRIGHT_PRIMARY_DB_NAME');
      expect(ENV_VARS.PRIMARY_SCHEMA_PATH).toBe('SPANWRIGHT_PRIMARY_SCHEMA_PATH');
    });

    it('should have secondary database environment variables', () => {
      expect(ENV_VARS.SECONDARY_DB_NAME).toBe('SPANWRIGHT_SECONDARY_DB_NAME');
      expect(ENV_VARS.SECONDARY_SCHEMA_PATH).toBe('SPANWRIGHT_SECONDARY_SCHEMA_PATH');
    });
  });

  describe('DEFAULTS', () => {
    it('should have default database count', () => {
      expect(DEFAULTS.DB_COUNT).toBe('1');
    });

    it('should have default database names', () => {
      expect(DEFAULTS.PRIMARY_DB_NAME).toBe('primary-db');
      expect(DEFAULTS.SECONDARY_DB_NAME).toBe('secondary-db');
    });

    it('should have default schema paths', () => {
      expect(DEFAULTS.PRIMARY_SCHEMA_PATH).toBe('./schema');
      expect(DEFAULTS.SECONDARY_SCHEMA_PATH).toBe('./schema2');
    });

    it('should have default project configuration', () => {
      expect(DEFAULTS.PROJECT_ID).toBe('test-project');
      expect(DEFAULTS.INSTANCE_ID).toBe('test-instance');
    });

    it('should have default Docker configuration', () => {
      expect(DEFAULTS.DOCKER_IMAGE).toBe('gcr.io/cloud-spanner-emulator/emulator');
      expect(DEFAULTS.CONTAINER_NAME).toBe('spanner-emulator');
    });

    it('should have default port configuration', () => {
      expect(DEFAULTS.SPANNER_PORT).toBe('9010');
      expect(DEFAULTS.ADMIN_PORT).toBe('9020');
    });

    it('should have default startup wait time', () => {
      expect(DEFAULTS.STARTUP_WAIT).toBe('20');
    });
  });

  describe('FILE_PATTERNS', () => {
    it('should have Go file extension', () => {
      expect(FILE_PATTERNS.GO_EXTENSION).toBe('.go');
    });

    it('should have template file patterns', () => {
      expect(FILE_PATTERNS.PACKAGE_JSON_TEMPLATE).toBe('_package.json');
      expect(FILE_PATTERNS.GITIGNORE_TEMPLATE).toBe('_gitignore');
      expect(FILE_PATTERNS.GO_MOD_TEMPLATE).toBe('go.mod.template');
    });

    it('should have output file patterns', () => {
      expect(FILE_PATTERNS.PACKAGE_JSON).toBe('package.json');
      expect(FILE_PATTERNS.GITIGNORE).toBe('.gitignore');
      expect(FILE_PATTERNS.GO_MOD).toBe('go.mod');
      expect(FILE_PATTERNS.ENV).toBe('.env');
    });
  });

  describe('TEMPLATE_VARS', () => {
    it('should have project name template variable', () => {
      expect(TEMPLATE_VARS.PROJECT_NAME).toBe('PROJECT_NAME');
    });
  });

  describe('VALIDATION', () => {
    it('should have valid database counts', () => {
      expect(VALIDATION.DB_COUNTS).toEqual(['1', '2']);
      expect(VALIDATION.DB_COUNTS).toHaveLength(2);
    });

    it('should have flag prefix', () => {
      expect(VALIDATION.FLAG_PREFIX).toBe('-');
    });

    it('should be readonly arrays', () => {
      expect(Array.isArray(VALIDATION.DB_COUNTS)).toBe(true);
    });
  });

  describe('MESSAGES', () => {
    describe('ERRORS', () => {
      it('should have error messages', () => {
        expect(MESSAGES.ERRORS.NO_PROJECT_NAME).toBe('Please specify a project name');
        expect(MESSAGES.ERRORS.INVALID_DB_COUNT).toBe('Please enter 1 or 2');
        expect(MESSAGES.ERRORS.ENV_DB_COUNT_INVALID).toBe('SPANWRIGHT_DB_COUNT must be 1 or 2');
      });

      it('should have directory exists error function', () => {
        expect(typeof MESSAGES.ERRORS.DIRECTORY_EXISTS).toBe('function');
        expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('test')).toBe('Directory "test" already exists');
      });
    });

    describe('INFO', () => {
      it('should have info messages', () => {
        expect(MESSAGES.INFO.STARTING_SETUP).toBe('Starting Spanner E2E Test Framework setup');
        expect(MESSAGES.INFO.CREATING_DIRECTORY).toBe('Creating project directory...');
        expect(MESSAGES.INFO.COPYING_TEMPLATES).toBe('Copying template files...');
        expect(MESSAGES.INFO.CONFIGURING_GO).toBe('Configuring Go modules...');
        expect(MESSAGES.INFO.CREATING_ENV).toBe('Creating environment configuration file...');
        expect(MESSAGES.INFO.REMOVING_FILES).toBe(
          'Removing unnecessary files (Single DB configuration)...'
        );
        expect(MESSAGES.INFO.COMPLETED).toBe('Project creation completed!');
      });
    });

    describe('USAGE', () => {
      it('should have usage messages', () => {
        expect(MESSAGES.USAGE.BASIC).toBe('Usage: npx spanwright my-project');
        expect(MESSAGES.USAGE.HELP_SUGGESTION).toBe(
          'Try "spanwright --help" for more information.'
        );
      });
    });
  });

  describe('Constant Immutability', () => {
    it('should maintain CLI_FLAGS structure', () => {
      expect(CLI_FLAGS.VERSION).toBeInstanceOf(Array);
      expect(CLI_FLAGS.HELP).toBeInstanceOf(Array);
      expect(typeof CLI_FLAGS.NON_INTERACTIVE).toBe('string');
    });

    it('should maintain VALIDATION arrays structure', () => {
      expect(VALIDATION.DB_COUNTS).toBeInstanceOf(Array);
      expect(typeof VALIDATION.FLAG_PREFIX).toBe('string');
    });

    it('should maintain DEFAULTS structure', () => {
      expect(typeof DEFAULTS.DB_COUNT).toBe('string');
      expect(typeof DEFAULTS.PRIMARY_DB_NAME).toBe('string');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for CLI_FLAGS', () => {
      const versionFlags: readonly string[] = CLI_FLAGS.VERSION;
      const helpFlags: readonly string[] = CLI_FLAGS.HELP;
      const nonInteractiveFlag: string = CLI_FLAGS.NON_INTERACTIVE;

      expect(versionFlags).toBeDefined();
      expect(helpFlags).toBeDefined();
      expect(nonInteractiveFlag).toBeDefined();
    });

    it('should maintain type safety for VALIDATION', () => {
      const dbCounts: readonly string[] = VALIDATION.DB_COUNTS;
      const flagPrefix: string = VALIDATION.FLAG_PREFIX;

      expect(dbCounts).toBeDefined();
      expect(flagPrefix).toBeDefined();
    });

    it('should maintain type safety for DEFAULTS', () => {
      expect(DEFAULTS.DB_COUNT).toBe('1');
      expect(['1', '2']).toContain(DEFAULTS.DB_COUNT);
    });
  });

  describe('Message Function Testing', () => {
    it('should generate directory exists message with different names', () => {
      expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('my-project')).toBe(
        'Directory "my-project" already exists'
      );
      expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('test-app')).toBe(
        'Directory "test-app" already exists'
      );
      expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('')).toBe('Directory "" already exists');
    });

    it('should handle special characters in directory names', () => {
      expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('project-with-dashes')).toBe(
        'Directory "project-with-dashes" already exists'
      );
      expect(MESSAGES.ERRORS.DIRECTORY_EXISTS('project_with_underscores')).toBe(
        'Directory "project_with_underscores" already exists'
      );
    });
  });
});
