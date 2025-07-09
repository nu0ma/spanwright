import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as readline from 'readline';
import { getConfiguration, generateEnvironmentContent, DatabaseConfig } from '../configuration';
import { ENV_VARS, DEFAULTS, MESSAGES } from '../constants';
import { ConfigurationError, ValidationError } from '../errors';
import { validateDatabaseCount, validateSchemaPath, sanitizeInput } from '../validation';

// Mock the validation module
vi.mock('../validation', () => ({
  validateDatabaseCount: vi.fn(),
  validateSchemaPath: vi.fn(),
  sanitizeInput: vi.fn((input: string) => input.trim()),
}));

// Mock readline module
vi.mock('readline', () => ({
  createInterface: vi.fn(),
}));

describe('Configuration Module', () => {
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods after clearing
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset environment variables
    delete process.env[ENV_VARS.DB_COUNT];
    delete process.env[ENV_VARS.PRIMARY_DB_NAME];
    delete process.env[ENV_VARS.PRIMARY_SCHEMA_PATH];
    delete process.env[ENV_VARS.SECONDARY_DB_NAME];
    delete process.env[ENV_VARS.SECONDARY_SCHEMA_PATH];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getConfiguration', () => {
    it('should call getNonInteractiveConfiguration when isNonInteractive is true', async () => {
      // Setup environment variables for non-interactive mode
      process.env[ENV_VARS.DB_COUNT] = '1';
      process.env[ENV_VARS.PRIMARY_DB_NAME] = 'test-db';
      process.env[ENV_VARS.PRIMARY_SCHEMA_PATH] = '/path/to/schema';

      // Mock validation to pass
      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result).toEqual({
        count: '1',
        primaryDbName: 'test-db',
        primarySchemaPath: '/path/to/schema',
        secondaryDbName: undefined,
        secondarySchemaPath: undefined,
      });

      expect(validateDatabaseCount).toHaveBeenCalledWith('1');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🤖 Non-interactive mode: Creating project with 1 database(s)'
      );
    });

    it('should call getInteractiveConfiguration when isNonInteractive is false', async () => {
      // Mock readline interface
      const mockQuestion = vi.fn();
      const mockClose = vi.fn();
      const mockReadlineInterface = {
        question: mockQuestion,
        close: mockClose,
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as any);

      // Mock user inputs
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('1');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('test-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/schema');
        });

      // Mock validation to pass
      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      const result = await getConfiguration(false);

      expect(result).toEqual({
        count: '1',
        primaryDbName: 'test-db',
        primarySchemaPath: '/path/to/schema',
      });

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('getNonInteractiveConfiguration', () => {
    it('should use environment variables when provided', async () => {
      process.env[ENV_VARS.DB_COUNT] = '2';
      process.env[ENV_VARS.PRIMARY_DB_NAME] = 'custom-primary';
      process.env[ENV_VARS.PRIMARY_SCHEMA_PATH] = '/custom/primary/schema';
      process.env[ENV_VARS.SECONDARY_DB_NAME] = 'custom-secondary';
      process.env[ENV_VARS.SECONDARY_SCHEMA_PATH] = '/custom/secondary/schema';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result).toEqual({
        count: '2',
        primaryDbName: 'custom-primary',
        primarySchemaPath: '/custom/primary/schema',
        secondaryDbName: 'custom-secondary',
        secondarySchemaPath: '/custom/secondary/schema',
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '🤖 Non-interactive mode: Creating project with 2 database(s)'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '   Primary DB: custom-primary (/custom/primary/schema)'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '   Secondary DB: custom-secondary (/custom/secondary/schema)'
      );
    });

    it('should use default values when environment variables are not set', async () => {
      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result).toEqual({
        count: DEFAULTS.DB_COUNT,
        primaryDbName: DEFAULTS.PRIMARY_DB_NAME,
        primarySchemaPath: DEFAULTS.PRIMARY_SCHEMA_PATH,
        secondaryDbName: undefined,
        secondarySchemaPath: undefined,
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        `🤖 Non-interactive mode: Creating project with ${DEFAULTS.DB_COUNT} database(s)`
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `   Primary DB: ${DEFAULTS.PRIMARY_DB_NAME} (${DEFAULTS.PRIMARY_SCHEMA_PATH})`
      );
    });

    it('should handle single database configuration', async () => {
      process.env[ENV_VARS.DB_COUNT] = '1';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result.count).toBe('1');
      expect(result.secondaryDbName).toBeUndefined();
      expect(result.secondarySchemaPath).toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Secondary DB:'));
    });

    it('should handle dual database configuration', async () => {
      process.env[ENV_VARS.DB_COUNT] = '2';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result.count).toBe('2');
      expect(result.secondaryDbName).toBe(DEFAULTS.SECONDARY_DB_NAME);
      expect(result.secondarySchemaPath).toBe(DEFAULTS.SECONDARY_SCHEMA_PATH);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Secondary DB:'));
    });

    it('should throw ConfigurationError for invalid database count', async () => {
      process.env[ENV_VARS.DB_COUNT] = '3';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {
        throw new Error('Invalid count');
      });

      await expect(getConfiguration(true)).rejects.toThrow(ConfigurationError);
      await expect(getConfiguration(true)).rejects.toThrow(MESSAGES.ERRORS.ENV_DB_COUNT_INVALID);
    });

    it('should validate database count', async () => {
      process.env[ENV_VARS.DB_COUNT] = '1';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      await getConfiguration(true);

      expect(validateDatabaseCount).toHaveBeenCalledWith('1');
    });
  });

  describe('getInteractiveConfiguration', () => {
    let mockQuestion: any;
    let mockClose: any;
    let mockReadlineInterface: any;

    beforeEach(() => {
      mockQuestion = vi.fn();
      mockClose = vi.fn();
      mockReadlineInterface = {
        question: mockQuestion,
        close: mockClose,
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface);
    });

    it('should handle single database configuration', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('1');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('my-primary-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/primary/schema');
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      const result = await getConfiguration(false);

      expect(result).toEqual({
        count: '1',
        primaryDbName: 'my-primary-db',
        primarySchemaPath: '/path/to/primary/schema',
      });

      expect(mockQuestion).toHaveBeenCalledTimes(3);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle dual database configuration', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('2');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('my-primary-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/primary/schema');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('my-secondary-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/secondary/schema');
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      const result = await getConfiguration(false);

      expect(result).toEqual({
        count: '2',
        primaryDbName: 'my-primary-db',
        primarySchemaPath: '/path/to/primary/schema',
        secondaryDbName: 'my-secondary-db',
        secondarySchemaPath: '/path/to/secondary/schema',
      });

      expect(mockQuestion).toHaveBeenCalledTimes(5);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should use default values for empty database names', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('2');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback(''); // Empty primary db name
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/primary/schema');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback(''); // Empty secondary db name
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/path/to/secondary/schema');
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      const result = await getConfiguration(false);

      expect(result.primaryDbName).toBe(DEFAULTS.PRIMARY_DB_NAME);
      expect(result.secondaryDbName).toBe(DEFAULTS.SECONDARY_DB_NAME);
    });

    it('should throw ConfigurationError for invalid database count', async () => {
      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        callback('3');
      });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {
        throw new Error('Invalid count');
      });

      await expect(getConfiguration(false)).rejects.toThrow(ConfigurationError);
      expect(mockClose).toHaveBeenCalled();
    }, 10000);

    it('should retry schema path validation on failure', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('1');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('my-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('invalid-path'); // First attempt - invalid
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/valid/path'); // Second attempt - valid
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath)
        .mockImplementationOnce(() => {
          throw new ValidationError('Path must be absolute');
        })
        .mockImplementationOnce(() => {}); // Second call succeeds

      const result = await getConfiguration(false);

      expect(result.primarySchemaPath).toBe('/valid/path');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Path must be absolute');
      expect(mockConsoleLog).toHaveBeenCalledWith('Please try again.');
      expect(mockQuestion).toHaveBeenCalledTimes(4); // 1 for count, 1 for name, 2 for schema path
    });

    it('should retry secondary schema path validation on failure', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('2');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('primary-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/primary/schema');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('secondary-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('invalid-secondary-path'); // First attempt - invalid
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/valid/secondary/path'); // Second attempt - valid
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath)
        .mockImplementationOnce(() => {}) // Primary schema path validation succeeds
        .mockImplementationOnce(() => {
          throw new ValidationError('Secondary path must be absolute');
        })
        .mockImplementationOnce(() => {}); // Secondary schema path validation succeeds on retry

      const result = await getConfiguration(false);

      expect(result.secondarySchemaPath).toBe('/valid/secondary/path');
      expect(mockConsoleError).toHaveBeenCalledWith('❌ Secondary path must be absolute');
      expect(mockConsoleLog).toHaveBeenCalledWith('Please try again.');
      expect(mockQuestion).toHaveBeenCalledTimes(6); // 2 for count/names, 1 for primary schema, 1 for secondary name, 2 for secondary schema
    });

    it('should re-throw non-ValidationError exceptions', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('1');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('my-db');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('/some/path');
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(getConfiguration(false)).rejects.toThrow('Unexpected error');
      expect(mockClose).toHaveBeenCalled();
    });

    it('should sanitize all user inputs', async () => {
      mockQuestion
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('  1  ');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('  my-db  ');
        })
        .mockImplementationOnce((query: string, callback: (answer: string) => void) => {
          callback('  /path/to/schema  ');
        });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});
      vi.mocked(sanitizeInput).mockImplementation((input: string) => input.trim());

      await getConfiguration(false);

      expect(sanitizeInput).toHaveBeenCalledWith('  1  ');
      expect(sanitizeInput).toHaveBeenCalledWith('  my-db  ');
      expect(sanitizeInput).toHaveBeenCalledWith('  /path/to/schema  ');
    });

    it('should always close readline interface even on error', async () => {
      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        callback('1');
      });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {
        throw new Error('Validation failed');
      });

      await expect(getConfiguration(false)).rejects.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('generateEnvironmentContent', () => {
    it('should generate environment content for single database configuration', () => {
      const config: DatabaseConfig = {
        count: '1',
        primaryDbName: 'test-primary',
        primarySchemaPath: '/path/to/primary/schema',
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('DB_COUNT=1');
      expect(result).toContain('PRIMARY_DB_ID=test-primary');
      expect(result).toContain('PRIMARY_DATABASE_ID=test-primary');
      expect(result).toContain('PRIMARY_DB_SCHEMA_PATH=/path/to/primary/schema');
      expect(result).toContain('PRIMARY_SCHEMA_PATH=/path/to/primary/schema');

      // Should not contain secondary database configuration
      expect(result).not.toContain('SECONDARY_DB_ID');
      expect(result).not.toContain('SECONDARY_DATABASE_ID');
      expect(result).not.toContain('SECONDARY_DB_SCHEMA_PATH');
      expect(result).not.toContain('SECONDARY_SCHEMA_PATH');

      // Should contain default project settings
      expect(result).toContain(`PROJECT_ID=${DEFAULTS.PROJECT_ID}`);
      expect(result).toContain(`INSTANCE_ID=${DEFAULTS.INSTANCE_ID}`);

      // Should contain default Docker settings
      expect(result).toContain(`DOCKER_IMAGE=${DEFAULTS.DOCKER_IMAGE}`);
      expect(result).toContain(`DOCKER_CONTAINER_NAME=${DEFAULTS.CONTAINER_NAME}`);
      expect(result).toContain(`DOCKER_SPANNER_PORT=${DEFAULTS.SPANNER_PORT}`);
      expect(result).toContain(`DOCKER_ADMIN_PORT=${DEFAULTS.ADMIN_PORT}`);
      expect(result).toContain(`DOCKER_STARTUP_WAIT=${DEFAULTS.STARTUP_WAIT}`);
    });

    it('should generate environment content for dual database configuration', () => {
      const config: DatabaseConfig = {
        count: '2',
        primaryDbName: 'test-primary',
        primarySchemaPath: '/path/to/primary/schema',
        secondaryDbName: 'test-secondary',
        secondarySchemaPath: '/path/to/secondary/schema',
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('DB_COUNT=2');
      expect(result).toContain('PRIMARY_DB_ID=test-primary');
      expect(result).toContain('PRIMARY_DATABASE_ID=test-primary');
      expect(result).toContain('PRIMARY_DB_SCHEMA_PATH=/path/to/primary/schema');
      expect(result).toContain('PRIMARY_SCHEMA_PATH=/path/to/primary/schema');

      // Should contain secondary database configuration
      expect(result).toContain('SECONDARY_DB_ID=test-secondary');
      expect(result).toContain('SECONDARY_DATABASE_ID=test-secondary');
      expect(result).toContain('SECONDARY_DB_SCHEMA_PATH=/path/to/secondary/schema');
      expect(result).toContain('SECONDARY_SCHEMA_PATH=/path/to/secondary/schema');

      // Should contain default project settings
      expect(result).toContain(`PROJECT_ID=${DEFAULTS.PROJECT_ID}`);
      expect(result).toContain(`INSTANCE_ID=${DEFAULTS.INSTANCE_ID}`);

      // Should contain default Docker settings
      expect(result).toContain(`DOCKER_IMAGE=${DEFAULTS.DOCKER_IMAGE}`);
      expect(result).toContain(`DOCKER_CONTAINER_NAME=${DEFAULTS.CONTAINER_NAME}`);
      expect(result).toContain(`DOCKER_SPANNER_PORT=${DEFAULTS.SPANNER_PORT}`);
      expect(result).toContain(`DOCKER_ADMIN_PORT=${DEFAULTS.ADMIN_PORT}`);
      expect(result).toContain(`DOCKER_STARTUP_WAIT=${DEFAULTS.STARTUP_WAIT}`);
    });

    it('should not include secondary database configuration when count is 2 but secondary values are missing', () => {
      const config: DatabaseConfig = {
        count: '2',
        primaryDbName: 'test-primary',
        primarySchemaPath: '/path/to/primary/schema',
        // Missing secondaryDbName and secondarySchemaPath
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('DB_COUNT=2');
      expect(result).toContain('PRIMARY_DB_ID=test-primary');

      // Should not contain secondary database configuration
      expect(result).not.toContain('SECONDARY_DB_ID');
      expect(result).not.toContain('SECONDARY_DATABASE_ID');
      expect(result).not.toContain('SECONDARY_DB_SCHEMA_PATH');
      expect(result).not.toContain('SECONDARY_SCHEMA_PATH');
    });

    it('should not include secondary database configuration when count is 2 but secondaryDbName is missing', () => {
      const config: DatabaseConfig = {
        count: '2',
        primaryDbName: 'test-primary',
        primarySchemaPath: '/path/to/primary/schema',
        secondarySchemaPath: '/path/to/secondary/schema',
        // Missing secondaryDbName
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('DB_COUNT=2');
      expect(result).not.toContain('SECONDARY_DB_ID');
      expect(result).not.toContain('SECONDARY_DATABASE_ID');
      expect(result).not.toContain('SECONDARY_DB_SCHEMA_PATH');
      expect(result).not.toContain('SECONDARY_SCHEMA_PATH');
    });

    it('should not include secondary database configuration when count is 2 but secondarySchemaPath is missing', () => {
      const config: DatabaseConfig = {
        count: '2',
        primaryDbName: 'test-primary',
        primarySchemaPath: '/path/to/primary/schema',
        secondaryDbName: 'test-secondary',
        // Missing secondarySchemaPath
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('DB_COUNT=2');
      expect(result).not.toContain('SECONDARY_DB_ID');
      expect(result).not.toContain('SECONDARY_DATABASE_ID');
      expect(result).not.toContain('SECONDARY_DB_SCHEMA_PATH');
      expect(result).not.toContain('SECONDARY_SCHEMA_PATH');
    });

    it('should include header comments', () => {
      const config: DatabaseConfig = {
        count: '1',
        primaryDbName: 'test-db',
        primarySchemaPath: '/path/to/schema',
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('# ================================================');
      expect(result).toContain('# Spanner E2E Testing Framework Configuration');
      expect(result).toContain('# Copy this file to .env and adjust the settings');
      expect(result).toContain('# ================================================');
      expect(result).toContain('# 🔧 Database Settings');
      expect(result).toContain('# 📊 Project Settings (usually no need to change)');
      expect(result).toContain('# 🐳 Docker Settings (usually no need to change)');
    });

    it('should handle special characters in database names and paths', () => {
      const config: DatabaseConfig = {
        count: '2',
        primaryDbName: 'test-db_with-special.chars',
        primarySchemaPath: '/path/to/schema with spaces',
        secondaryDbName: 'secondary-db_with-special.chars',
        secondarySchemaPath: '/path/to/secondary schema with spaces',
      };

      const result = generateEnvironmentContent(config);

      expect(result).toContain('PRIMARY_DB_ID=test-db_with-special.chars');
      expect(result).toContain('PRIMARY_DB_SCHEMA_PATH=/path/to/schema with spaces');
      expect(result).toContain('SECONDARY_DB_ID=secondary-db_with-special.chars');
      expect(result).toContain('SECONDARY_DB_SCHEMA_PATH=/path/to/secondary schema with spaces');
    });

    it('should maintain consistent formatting', () => {
      const config: DatabaseConfig = {
        count: '1',
        primaryDbName: 'test-db',
        primarySchemaPath: '/path/to/schema',
      };

      const result = generateEnvironmentContent(config);

      // Check that each section is properly separated
      const sections = result.split('\n\n');
      expect(sections.length).toBeGreaterThan(1);

      // Check that variables are properly formatted (KEY=VALUE)
      const lines = result.split('\n');
      const variableLines = lines.filter(line => line.includes('=') && !line.startsWith('#'));
      variableLines.forEach(line => {
        expect(line).toMatch(/^[A-Z_]+=.+$/);
      });
    });
  });

  describe('PromptInterface', () => {
    it('should create readline interface on construction', async () => {
      const mockReadlineInterface = {
        question: vi.fn((query: string, callback: (answer: string) => void) => {
          callback('1');
        }),
        close: vi.fn(),
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as any);
      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      // Trigger the creation of PromptInterface through interactive configuration
      await getConfiguration(false);

      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
    });

    it('should handle question method correctly', async () => {
      const mockQuestion = vi.fn();
      const mockClose = vi.fn();
      const mockReadlineInterface = {
        question: mockQuestion,
        close: mockClose,
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as any);

      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        expect(query).toBe('Select number of databases (1 or 2): ');
        callback('1');
      });

      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        expect(query).toBe('Primary DB name (default: primary-db): ');
        callback('test-db');
      });

      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        expect(query).toBe('Primary DB schema path: ');
        callback('/path/to/schema');
      });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});
      vi.mocked(validateSchemaPath).mockImplementation(() => {});

      await getConfiguration(false);

      expect(mockQuestion).toHaveBeenCalledTimes(3);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should close readline interface properly', async () => {
      const mockQuestion = vi.fn();
      const mockClose = vi.fn();
      const mockReadlineInterface = {
        question: mockQuestion,
        close: mockClose,
      };

      vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as any);

      mockQuestion.mockImplementationOnce((query: string, callback: (answer: string) => void) => {
        callback('1');
      });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {
        throw new Error('Validation error');
      });

      await expect(getConfiguration(false)).rejects.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string environment variables', async () => {
      process.env[ENV_VARS.DB_COUNT] = '';
      process.env[ENV_VARS.PRIMARY_DB_NAME] = '';
      process.env[ENV_VARS.PRIMARY_SCHEMA_PATH] = '';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result.count).toBe(DEFAULTS.DB_COUNT);
      expect(result.primaryDbName).toBe(DEFAULTS.PRIMARY_DB_NAME);
      expect(result.primarySchemaPath).toBe(DEFAULTS.PRIMARY_SCHEMA_PATH);
    });

    it('should handle undefined environment variables gracefully', async () => {
      // Ensure all environment variables are undefined
      Object.values(ENV_VARS).forEach(envVar => {
        delete process.env[envVar];
      });

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      const result = await getConfiguration(true);

      expect(result.count).toBe(DEFAULTS.DB_COUNT);
      expect(result.primaryDbName).toBe(DEFAULTS.PRIMARY_DB_NAME);
      expect(result.primarySchemaPath).toBe(DEFAULTS.PRIMARY_SCHEMA_PATH);
    });

    it('should preserve original process.env after configuration', async () => {
      process.env[ENV_VARS.DB_COUNT] = '1';
      process.env[ENV_VARS.PRIMARY_DB_NAME] = 'test-db';

      vi.mocked(validateDatabaseCount).mockImplementation(() => {});

      await getConfiguration(true);

      expect(process.env[ENV_VARS.DB_COUNT]).toBe('1');
      expect(process.env[ENV_VARS.PRIMARY_DB_NAME]).toBe('test-db');
    });
  });
});
