import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validateDatabaseCount,
  validateSchemaPath,
  validateDatabaseName,
  validateTemplateVariable,
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

    it('should throw ValidationError for empty or undefined name', () => {
      expect(() => validateProjectName(undefined)).toThrow(ValidationError);
      expect(() => validateProjectName('')).toThrow(ValidationError);
      expect(() => validateProjectName('   ')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateProjectName('my/project')).toThrow(ValidationError);
      expect(() => validateProjectName('my\\project')).toThrow(ValidationError);
      expect(() => validateProjectName('.hidden-project')).toThrow(ValidationError);
      expect(() => validateProjectName('123project')).toThrow(ValidationError);
      expect(() => validateProjectName('project.name')).toThrow(ValidationError);
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
      expect(() => validateDatabaseCount('one')).toThrow(ValidationError);
      expect(() => validateDatabaseCount('')).toThrow(ValidationError);
    });
  });

  describe('validateSchemaPath', () => {
    it('should pass for valid paths', () => {
      expect(() => validateSchemaPath('/valid/path/to/schema', 'Schema path')).not.toThrow();
      expect(() => validateSchemaPath('relative/path/to/schema', 'Schema path')).not.toThrow();
      expect(() => validateSchemaPath('./schema', 'Schema path')).not.toThrow();
      expect(() => validateSchemaPath('schema.sql', 'Schema path')).not.toThrow();
    });

    it('should throw ValidationError for empty path', () => {
      expect(() => validateSchemaPath('', 'Schema path')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateSchemaPath('schema;path', 'Schema path')).toThrow(ValidationError);
      expect(() => validateSchemaPath('schema|path', 'Schema path')).toThrow(ValidationError);
    });
  });

  describe('validateDatabaseName', () => {
    it('should pass for valid database names', () => {
      expect(() => validateDatabaseName('my-database', 'Database name')).not.toThrow();
      expect(() => validateDatabaseName('test_db_123', 'Database name')).not.toThrow();
      expect(() => validateDatabaseName('validName', 'Database name')).not.toThrow();
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => validateDatabaseName('', 'Database name')).toThrow(ValidationError);
    });

    it('should throw ValidationError for names too long', () => {
      const longName = 'a'.repeat(31); // 31 characters
      expect(() => validateDatabaseName(longName, 'Database name')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateDatabaseName('123invalid', 'Database name')).toThrow(ValidationError);
      expect(() => validateDatabaseName('invalid.name', 'Database name')).toThrow(ValidationError);
    });
  });

  describe('validateTemplateVariable', () => {
    it('should pass for valid template variables', () => {
      expect(() => validateTemplateVariable('variable123', 'Variable')).not.toThrow();
      expect(() => validateTemplateVariable('valid_var', 'Variable')).not.toThrow();
      expect(() => validateTemplateVariable('test-var', 'Variable')).not.toThrow();
    });

    it('should throw ValidationError for empty variable', () => {
      expect(() => validateTemplateVariable('', 'Variable')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid characters', () => {
      expect(() => validateTemplateVariable('var.name', 'Variable')).toThrow(ValidationError);
      expect(() => validateTemplateVariable('var/name', 'Variable')).toThrow(ValidationError);
    });
  });

  describe('isFlag', () => {
    it('should identify flags correctly', () => {
      expect(isFlag('--help')).toBe(true);
      expect(isFlag('-v')).toBe(true);
      expect(isFlag('--version')).toBe(true);
    });

    it('should not identify non-flags', () => {
      expect(isFlag('help')).toBe(false);
      expect(isFlag('project-name')).toBe(false);
      expect(isFlag('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('\ttest\n')).toBe('test');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve valid content', () => {
      expect(sanitizeInput('valid-input')).toBe('valid-input');
      expect(sanitizeInput('test123')).toBe('test123');
    });
  });
});