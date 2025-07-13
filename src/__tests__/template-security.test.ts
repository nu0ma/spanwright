import { describe, it, expect } from 'vitest';
import {
  escapeForTemplate,
  validateTemplateInput,
  simpleTemplateReplace,
  SAFE_PATTERNS,
} from '../template-security';
import { SecurityError } from '../errors';

describe('Template Security Module', () => {
  describe('escapeForTemplate', () => {
    it('should pass valid inputs through unchanged', () => {
      expect(escapeForTemplate('validInput')).toBe('validInput');
      expect(escapeForTemplate('test-123')).toBe('test-123');
      expect(escapeForTemplate('project_name')).toBe('project_name');
    });

    it('should throw SecurityError for invalid inputs', () => {
      expect(() => escapeForTemplate('invalid.input')).toThrow(SecurityError);
      expect(() => escapeForTemplate('invalid/input')).toThrow(SecurityError);
      expect(() => escapeForTemplate('invalid\\input')).toThrow(SecurityError);
    });
  });

  describe('validateTemplateInput', () => {
    it('should pass for valid generic identifiers', () => {
      expect(() => validateTemplateInput('validInput')).not.toThrow();
      expect(() => validateTemplateInput('test-123')).not.toThrow();
      expect(() => validateTemplateInput('project_name')).not.toThrow();
    });

    it('should pass for valid project names', () => {
      expect(() => validateTemplateInput('myProject', 'PROJECT_NAME')).not.toThrow();
      expect(() => validateTemplateInput('test-project', 'PROJECT_NAME')).not.toThrow();
    });

    it('should pass for valid schema paths', () => {
      expect(() => validateTemplateInput('./schema/test.sql', 'SCHEMA_PATH')).not.toThrow();
      expect(() => validateTemplateInput('/path/to/schema', 'SCHEMA_PATH')).not.toThrow();
    });

    it('should throw SecurityError for invalid inputs', () => {
      expect(() => validateTemplateInput('invalid.input')).toThrow(SecurityError);
      expect(() => validateTemplateInput('123invalid', 'PROJECT_NAME')).toThrow(SecurityError);
    });
  });

  describe('simpleTemplateReplace', () => {
    it('should replace template variables correctly', () => {
      const content = 'Hello PROJECT_NAME, this is a test.';
      const replacements = { PROJECT_NAME: 'testProject' };
      const result = simpleTemplateReplace(content, replacements);
      expect(result).toBe('Hello testProject, this is a test.');
    });

    it('should handle multiple replacements', () => {
      const content = 'Project: PROJECT_NAME, Database: DB_NAME';
      const replacements = {
        PROJECT_NAME: 'myProject',
        DB_NAME: 'testDB',
      };
      const result = simpleTemplateReplace(content, replacements);
      expect(result).toBe('Project: myProject, Database: testDB');
    });

    it('should validate replacement values', () => {
      const content = 'Hello PROJECT_NAME';
      const replacements = { PROJECT_NAME: 'invalid.name' };
      expect(() => simpleTemplateReplace(content, replacements)).toThrow(SecurityError);
    });
  });

  describe('SAFE_PATTERNS', () => {
    it('should export validation patterns', () => {
      expect(SAFE_PATTERNS.GENERIC_IDENTIFIER).toBeDefined();
      expect(SAFE_PATTERNS.PROJECT_NAME).toBeDefined();
      expect(SAFE_PATTERNS.DATABASE_NAME).toBeDefined();
      expect(SAFE_PATTERNS.SCHEMA_PATH).toBeDefined();
    });

    it('should validate correct patterns', () => {
      expect(SAFE_PATTERNS.GENERIC_IDENTIFIER.test('validInput')).toBe(true);
      expect(SAFE_PATTERNS.GENERIC_IDENTIFIER.test('invalid.input')).toBe(false);

      expect(SAFE_PATTERNS.PROJECT_NAME.test('myProject')).toBe(true);
      expect(SAFE_PATTERNS.PROJECT_NAME.test('123invalid')).toBe(false);
    });
  });
});
