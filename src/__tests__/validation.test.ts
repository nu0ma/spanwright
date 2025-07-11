import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validateDatabaseCount,
  validateSchemaPath,
  isFlag,
  sanitizeInput,
} from '../validation';
import { ValidationError } from '../errors';

describe('Validation Module', () => {
  describe('validateProjectName', () => {
    it('should pass for valid project names', () => {
      expect(() => validateProjectName('my-project')).not.toThrow();
      expect(() => validateProjectName('project123')).not.toThrow();
      expect(() => validateProjectName('Project_Name')).not.toThrow();
      expect(() => validateProjectName('test-project-name')).not.toThrow();
    });

    it('should throw ValidationError for undefined name', () => {
      expect(() => validateProjectName(undefined)).toThrow(ValidationError);
      expect(() => validateProjectName(undefined)).toThrow('Project name cannot be empty');
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => validateProjectName('')).toThrow(ValidationError);
      expect(() => validateProjectName('')).toThrow('Project name cannot be empty');
    });

    it('should throw ValidationError for whitespace-only name', () => {
      expect(() => validateProjectName('   ')).toThrow(ValidationError);
      expect(() => validateProjectName('   ')).toThrow('Project name cannot be empty');
    });

    it('should throw ValidationError for names containing forward slash', () => {
      expect(() => validateProjectName('my/project')).toThrow(ValidationError);
      expect(() => validateProjectName('my/project')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should throw ValidationError for names containing backslash', () => {
      expect(() => validateProjectName('my\\project')).toThrow(ValidationError);
      expect(() => validateProjectName('my\\project')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should throw ValidationError for names starting with dot', () => {
      expect(() => validateProjectName('.hidden-project')).toThrow(ValidationError);
      expect(() => validateProjectName('.hidden-project')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should throw ValidationError for project name containing path traversal', () => {
      expect(() => validateProjectName('project..')).toThrow(ValidationError);
      expect(() => validateProjectName('project..')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );

      expect(() => validateProjectName('..project')).toThrow(ValidationError);
      expect(() => validateProjectName('..project')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );

      expect(() => validateProjectName('proj..ect')).toThrow(ValidationError);
      expect(() => validateProjectName('proj..ect')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should throw ValidationError for project name containing null bytes', () => {
      expect(() => validateProjectName('project\0')).toThrow(ValidationError);
      expect(() => validateProjectName('project\0')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );

      expect(() => validateProjectName('pro\0ject')).toThrow(ValidationError);
      expect(() => validateProjectName('pro\0ject')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should throw ValidationError for Windows absolute paths', () => {
      expect(() => validateProjectName('C:project')).toThrow(ValidationError);
      expect(() => validateProjectName('C:project')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );

      expect(() => validateProjectName('D:test')).toThrow(ValidationError);
      expect(() => validateProjectName('D:test')).toThrow(
        'Project name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should reject project names with dots for security', () => {
      expect(() => validateProjectName('project.name')).toThrow(ValidationError);
      expect(() => validateProjectName('my.project.test')).toThrow(ValidationError);
      expect(() => validateProjectName('file.txt')).toThrow(ValidationError);
    });

    it('should throw ValidationError with correct field name', () => {
      try {
        validateProjectName('');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('projectName');
      }
    });
  });

  describe('validateDatabaseCount', () => {
    it('should pass for valid database counts', () => {
      expect(() => validateDatabaseCount('1')).not.toThrow();
      expect(() => validateDatabaseCount('2')).not.toThrow();
    });

    it('should throw ValidationError for invalid counts', () => {
      expect(() => validateDatabaseCount('0')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('3')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('10')).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-numeric strings', () => {
      expect(() => validateDatabaseCount('one')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('two')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('abc')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => validateDatabaseCount('')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('')).toThrow('Database count must be 1 or 2');
    });

    it('should throw ValidationError with correct field name', () => {
      try {
        validateDatabaseCount('3');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('dbCount');
      }
    });
  });

  describe('validateSchemaPath', () => {
    it('should pass for valid relative paths', () => {
      expect(() => validateSchemaPath('path/to/schema', 'schemaPath')).not.toThrow();
      expect(() => validateSchemaPath('tmp/schema', 'schemaPath')).not.toThrow();
      expect(() => validateSchemaPath('schema', 'schemaPath')).not.toThrow();
    });

    it('should throw ValidationError for empty path', () => {
      expect(() => validateSchemaPath('', 'schemaPath')).toThrow(ValidationError);
      expect(() => validateSchemaPath('', 'schemaPath')).toThrow('schemaPath cannot be empty');
    });

    it('should throw ValidationError for whitespace-only path', () => {
      expect(() => validateSchemaPath('   ', 'schemaPath')).toThrow(ValidationError);
      expect(() => validateSchemaPath('   ', 'schemaPath')).toThrow('schemaPath cannot be empty');
    });

    it('should accept absolute paths (path traversal prevention still applies)', () => {
      expect(() => validateSchemaPath('/absolute/path', 'schemaPath')).not.toThrow();
      expect(() => validateSchemaPath('/home/user/schema', 'schemaPath')).not.toThrow();
    });

    it('should throw ValidationError for paths with path traversal', () => {
      expect(() => validateSchemaPath('../relative/path', 'schemaPath')).toThrow(ValidationError);
      expect(() => validateSchemaPath('../relative/path', 'schemaPath')).toThrow(
        'schemaPath security validation failed'
      );
    });

    it('should allow paths starting with dot', () => {
      expect(() => validateSchemaPath('./relative/path', 'schemaPath')).not.toThrow();
      expect(() => validateSchemaPath('./other/path', 'schemaPath')).not.toThrow();
    });

    it('should use correct field name in error message', () => {
      const fieldName = 'primarySchemaPath';

      try {
        validateSchemaPath('', fieldName);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain(fieldName);
        expect((error as ValidationError).field).toBe(fieldName);
      }
    });

    it('should handle different field names correctly', () => {
      const testCases = ['primarySchemaPath', 'secondarySchemaPath', 'customFieldName'];

      testCases.forEach(fieldName => {
        // Test with empty string to trigger validation error
        try {
          validateSchemaPath('', fieldName);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as ValidationError).message).toContain(`${fieldName} cannot be empty`);
          expect((error as ValidationError).field).toBe(fieldName);
        }
      });
    });
  });

  describe('isFlag', () => {
    it('should return true for arguments starting with flag prefix', () => {
      expect(isFlag('-h')).toBe(true);
      expect(isFlag('--help')).toBe(true);
      expect(isFlag('-v')).toBe(true);
      expect(isFlag('--version')).toBe(true);
      expect(isFlag('--non-interactive')).toBe(true);
    });

    it('should return false for arguments not starting with flag prefix', () => {
      expect(isFlag('project-name')).toBe(false);
      expect(isFlag('help')).toBe(false);
      expect(isFlag('version')).toBe(false);
      expect(isFlag('my-project')).toBe(false);
      expect(isFlag('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isFlag('-')).toBe(true); // Single dash
      expect(isFlag('--')).toBe(true); // Double dash
      expect(isFlag('---')).toBe(true); // Triple dash
      expect(isFlag('a-b-c')).toBe(false); // Contains dash but doesn't start with it
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace from input', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('  world')).toBe('world');
      expect(sanitizeInput('test  ')).toBe('test');
    });

    it('should handle strings with no whitespace', () => {
      expect(sanitizeInput('hello')).toBe('hello');
      expect(sanitizeInput('test-project')).toBe('test-project');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should handle strings with internal whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('  test   project  ')).toBe('test   project');
    });

    it('should handle newlines and tabs', () => {
      expect(sanitizeInput('\\n\\nhello\\n\\n')).toBe('\\n\\nhello\\n\\n');
      expect(sanitizeInput('\\t\\thello\\t\\t')).toBe('\\t\\thello\\t\\t');
    });
  });
});
