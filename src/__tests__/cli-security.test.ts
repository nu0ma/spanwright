import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateProjectName } from '../validation';
import { ValidationError } from '../errors';

describe('CLI Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Project Name Security Validation', () => {
    it('should prevent path traversal attacks in project names', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\..\\Windows\\System32',
        'project../../../etc',
        '../project',
        'project..',
        '..project..',
        'safe/../unsafe',
      ];

      maliciousNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });

    it('should prevent null byte injection in project names', () => {
      const maliciousNames = [
        'project\0.js',
        'project\0/../../../etc/passwd',
        'safe\0unsafe',
        '\0project',
        'project\0',
      ];

      maliciousNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });

    it('should prevent absolute path injection in project names', () => {
      const maliciousNames = [
        '/etc/passwd',
        '/root/.ssh/id_rsa',
        'C:Windows\\System32',
        'D:temp\\evil',
        '/tmp/evil',
        '\\\\server\\share\\evil',
      ];

      maliciousNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });

    it('should prevent hidden file/directory creation', () => {
      const hiddenNames = ['.hidden-project', '.secret', '.ssh', '.config'];

      hiddenNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });

    it('should allow safe project names', () => {
      const safeNames = [
        'my-project',
        'project123',
        'Project_Name',
        'test-project-name',
        'myproject',
        'test_project',
      ];

      safeNames.forEach(name => {
        expect(() => validateProjectName(name)).not.toThrow();
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should reject Unicode characters for security', () => {
      const unicodeNames = ['项目名称', 'プロジェクト', 'проект', 'مشروع', '📁project📄'];

      unicodeNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });

    it('should reject very long project names', () => {
      const longName = 'a'.repeat(1000);
      expect(() => validateProjectName(longName)).toThrow(ValidationError);
    });

    it('should handle empty and whitespace-only names', () => {
      const invalidNames = ['', '   ', '\t\n\r'];

      invalidNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    it('should handle mixed encoding attacks', () => {
      const encodedNames = [
        '%2e%2e%2f', // URL encoded ../ - contains % which is not allowed
        'unicode.encoded', // Contains dot which is not allowed
      ];

      encodedNames.forEach(name => {
        // These should be rejected due to special characters
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });

      // These contain actual dangerous characters that should be detected
      expect(() => validateProjectName('..%2f')).toThrow(ValidationError);
      expect(() => validateProjectName('%2e%2e\\\\')).toThrow(ValidationError); // Contains \\
    });

    it('should handle case sensitivity correctly', () => {
      const caseVariations = [
        'PROJECT',
        'Project',
        'project',
        'PrOjEcT',
        'MY-PROJECT',
        'my-project',
      ];

      caseVariations.forEach(name => {
        expect(() => validateProjectName(name)).not.toThrow();
      });
    });

    it('should reject special characters for security', () => {
      const specialNames = [
        'project@company.com',
        'project+version',
        'project-v1.0', // Contains dot which is not allowed
        'project(1)',
        'project[test]',
        'project{dev}',
      ];

      specialNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });

      // These should be allowed (only letters, numbers, hyphens, underscores)
      expect(() => validateProjectName('project_final')).not.toThrow();
      expect(() => validateProjectName('project-v1')).not.toThrow();
    });

    it('should reject dangerous pattern combinations', () => {
      const dangerousNames = ['project..evil', 'test/../hack', 'normal\0inject', '.hidden/../etc'];

      dangerousNames.forEach(name => {
        expect(() => validateProjectName(name)).toThrow(ValidationError);
      });
    });
  });
});
