import { describe, it, expect } from 'vitest';
import {
  escapeForJavaScript,
  escapeForShell,
  escapeForSQL,
  escapeForGeneric,
  getFileContext,
  validateTemplateInput,
  escapeForContext,
  secureTemplateReplace,
  SAFE_PATTERNS
} from '../template-security';
import { SecurityError } from '../errors';

describe('Template Security Module', () => {
  describe('Context Detection', () => {
    it('should detect JavaScript context for .js files', () => {
      expect(getFileContext('/path/to/file.js')).toBe('javascript');
      expect(getFileContext('/path/to/file.ts')).toBe('javascript');
      expect(getFileContext('/path/to/file.jsx')).toBe('javascript');
      expect(getFileContext('/path/to/file.tsx')).toBe('javascript');
    });

    it('should detect shell context for shell files', () => {
      expect(getFileContext('/path/to/file.sh')).toBe('shell');
      expect(getFileContext('/path/to/file.bash')).toBe('shell');
      expect(getFileContext('/path/to/Makefile')).toBe('shell');
      expect(getFileContext('/path/to/makefile')).toBe('shell');
      expect(getFileContext('/path/to/file.mk')).toBe('shell');
    });

    it('should detect SQL context for SQL files', () => {
      expect(getFileContext('/path/to/file.sql')).toBe('sql');
      expect(getFileContext('/path/to/file.ddl')).toBe('sql');
      expect(getFileContext('/path/to/file.dml')).toBe('sql');
    });

    it('should detect generic context for unknown files', () => {
      expect(getFileContext('/path/to/file.txt')).toBe('generic');
      expect(getFileContext('/path/to/file.go')).toBe('generic');
      expect(getFileContext('/path/to/file.md')).toBe('generic');
      expect(getFileContext('/path/to/file.yaml')).toBe('generic');
      expect(getFileContext('/path/to/file.unknown')).toBe('generic');
    });
  });

  describe('Safe Pattern Validation', () => {
    it('should validate project names with safe patterns', () => {
      expect(SAFE_PATTERNS.PROJECT_NAME.test('myproject')).toBe(true);
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my-project')).toBe(true);
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my_project')).toBe(true);
      expect(SAFE_PATTERNS.PROJECT_NAME.test('MyProject123')).toBe(true);
      
      // Invalid patterns
      expect(SAFE_PATTERNS.PROJECT_NAME.test('123project')).toBe(false); // starts with number
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my project')).toBe(false); // contains space
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my.project')).toBe(false); // contains dot
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my/project')).toBe(false); // contains slash
      expect(SAFE_PATTERNS.PROJECT_NAME.test('my$project')).toBe(false); // contains dollar
    });

    it('should validate database names with safe patterns', () => {
      expect(SAFE_PATTERNS.DATABASE_NAME.test('mydb')).toBe(true);
      expect(SAFE_PATTERNS.DATABASE_NAME.test('my-db')).toBe(true);
      expect(SAFE_PATTERNS.DATABASE_NAME.test('my_db')).toBe(true);
      expect(SAFE_PATTERNS.DATABASE_NAME.test('MyDB123')).toBe(true);
      
      // Invalid patterns
      expect(SAFE_PATTERNS.DATABASE_NAME.test('123db')).toBe(false); // starts with number
      expect(SAFE_PATTERNS.DATABASE_NAME.test('my db')).toBe(false); // contains space
      expect(SAFE_PATTERNS.DATABASE_NAME.test('my.db')).toBe(false); // contains dot
      expect(SAFE_PATTERNS.DATABASE_NAME.test('my$db')).toBe(false); // contains dollar
    });
  });

  describe('Template Input Validation', () => {
    it('should validate safe template inputs', () => {
      expect(() => validateTemplateInput('myproject', 'PROJECT_NAME')).not.toThrow();
      expect(() => validateTemplateInput('my-project', 'PROJECT_NAME')).not.toThrow();
      expect(() => validateTemplateInput('my_project', 'PROJECT_NAME')).not.toThrow();
    });

    it('should reject template inputs with invalid characters', () => {
      expect(() => validateTemplateInput('my project', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('my.project', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('my/project', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('my$project', 'PROJECT_NAME')).toThrow(SecurityError);
    });

    it('should reject template inputs with null bytes', () => {
      expect(() => validateTemplateInput('my\0project', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('myproject\0', 'PROJECT_NAME')).toThrow(SecurityError);
    });

    it('should reject template inputs with path traversal', () => {
      expect(() => validateTemplateInput('my..project', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('..myproject', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => validateTemplateInput('myproject..', 'PROJECT_NAME')).toThrow(SecurityError);
    });

    it('should reject template inputs that are too long', () => {
      const longInput = 'a'.repeat(101);
      expect(() => validateTemplateInput(longInput, 'PROJECT_NAME')).toThrow(SecurityError);
    });
  });

  describe('JavaScript Context Escaping', () => {
    it('should escape JavaScript special characters', () => {
      expect(escapeForJavaScript('test')).toBe('test');
      expect(escapeForJavaScript('test-name')).toBe('test-name');
      expect(escapeForJavaScript('test_name')).toBe('test_name');
    });

    it('should reject JavaScript injection attempts', () => {
      expect(() => escapeForJavaScript("test'; process.exit(1); //")).toThrow(SecurityError);
      expect(() => escapeForJavaScript('test"; eval("code"); //')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('test`${malicious}`')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('test$(injection)')).toThrow(SecurityError);
    });

    it('should reject JavaScript with invalid characters', () => {
      expect(() => escapeForJavaScript('test project')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('test.project')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('test/project')).toThrow(SecurityError);
    });
  });

  describe('Shell Context Escaping', () => {
    it('should escape shell-safe inputs', () => {
      expect(escapeForShell('test')).toBe('test');
      expect(escapeForShell('test-name')).toBe('test-name');
      expect(escapeForShell('test_name')).toBe('test_name');
    });

    it('should reject shell injection attempts', () => {
      expect(() => escapeForShell('test; rm -rf /')).toThrow(SecurityError);
      expect(() => escapeForShell('test$(rm -rf /)')).toThrow(SecurityError);
      expect(() => escapeForShell('test`rm -rf /`')).toThrow(SecurityError);
      expect(() => escapeForShell('test && rm -rf /')).toThrow(SecurityError);
      expect(() => escapeForShell('test | rm -rf /')).toThrow(SecurityError);
    });

    it('should reject shell with invalid characters', () => {
      expect(() => escapeForShell('test project')).toThrow(SecurityError);
      expect(() => escapeForShell('test.project')).toThrow(SecurityError);
      expect(() => escapeForShell('test/project')).toThrow(SecurityError);
    });
  });

  describe('SQL Context Escaping', () => {
    it('should escape SQL-safe inputs', () => {
      expect(escapeForSQL('test')).toBe('test');
      expect(escapeForSQL('test-name')).toBe('test-name');
      expect(escapeForSQL('test_name')).toBe('test_name');
    });

    it('should reject SQL injection attempts', () => {
      expect(() => escapeForSQL("test'; DROP TABLE users; --")).toThrow(SecurityError);
      expect(() => escapeForSQL('test"; DELETE FROM users; --')).toThrow(SecurityError);
      expect(() => escapeForSQL('test; INSERT INTO users')).toThrow(SecurityError);
      expect(() => escapeForSQL('test/* comment */ SELECT')).toThrow(SecurityError);
    });

    it('should reject SQL with invalid characters', () => {
      expect(() => escapeForSQL('test project')).toThrow(SecurityError);
      expect(() => escapeForSQL('test.project')).toThrow(SecurityError);
      expect(() => escapeForSQL('test/project')).toThrow(SecurityError);
    });
  });

  describe('Generic Context Escaping', () => {
    it('should escape generic-safe inputs', () => {
      expect(escapeForGeneric('test')).toBe('test');
      expect(escapeForGeneric('test-name')).toBe('test-name');
      expect(escapeForGeneric('test_name')).toBe('test_name');
    });

    it('should reject generic injection attempts', () => {
      expect(() => escapeForGeneric('test$(injection)')).toThrow(SecurityError);
      expect(() => escapeForGeneric('test`injection`')).toThrow(SecurityError);
      expect(() => escapeForGeneric('test"injection"')).toThrow(SecurityError);
    });

    it('should reject generic with invalid characters', () => {
      expect(() => escapeForGeneric('test project')).toThrow(SecurityError);
      expect(() => escapeForGeneric('test.project')).toThrow(SecurityError);
      expect(() => escapeForGeneric('test/project')).toThrow(SecurityError);
    });
  });

  describe('Context-Aware Escaping', () => {
    it('should route to correct escaping function based on context', () => {
      const input = 'testproject';
      
      expect(escapeForContext(input, 'javascript')).toBe(input);
      expect(escapeForContext(input, 'shell')).toBe(input);
      expect(escapeForContext(input, 'sql')).toBe(input);
      expect(escapeForContext(input, 'generic')).toBe(input);
    });

    it('should reject invalid context', () => {
      expect(() => escapeForContext('test', 'unknown' as any)).toThrow(SecurityError);
    });

    it('should validate input before escaping', () => {
      expect(() => escapeForContext('test project', 'javascript')).toThrow(SecurityError);
      expect(() => escapeForContext('test$()', 'shell')).toThrow(SecurityError);
      expect(() => escapeForContext('test;', 'sql')).toThrow(SecurityError);
    });
  });

  describe('Secure Template Replacement', () => {
    it('should perform secure template replacement for JavaScript files', () => {
      const content = 'export const name = "PROJECT_NAME";';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'test.js');
      
      expect(result).toBe('export const name = "myproject";');
    });

    it('should perform secure template replacement for shell files', () => {
      const content = 'PROJECT_NAME = PROJECT_NAME';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'Makefile');
      
      expect(result).toBe('myproject = myproject');
    });

    it('should perform secure template replacement for SQL files', () => {
      const content = 'CREATE DATABASE PROJECT_NAME;';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'schema.sql');
      
      expect(result).toBe('CREATE DATABASE myproject;');
    });

    it('should perform secure template replacement for generic files', () => {
      const content = 'name: PROJECT_NAME';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'config.yaml');
      
      expect(result).toBe('name: myproject');
    });

    it('should reject injection attempts in template replacement', () => {
      const content = 'export const name = "PROJECT_NAME";';
      const maliciousReplacements = { PROJECT_NAME: "test'; process.exit(1); //" };
      
      expect(() => secureTemplateReplace(content, maliciousReplacements, 'test.js')).toThrow(SecurityError);
    });

    it('should handle multiple replacements safely', () => {
      const content = 'PROJECT_NAME uses DATABASE_NAME';
      const replacements = { 
        PROJECT_NAME: 'myproject',
        DATABASE_NAME: 'mydb'
      };
      const result = secureTemplateReplace(content, replacements, 'config.txt');
      
      expect(result).toBe('myproject uses mydb');
    });

    it('should handle no matches gracefully', () => {
      const content = 'static content';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'test.txt');
      
      expect(result).toBe('static content');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty strings', () => {
      expect(() => validateTemplateInput('', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('')).toThrow(SecurityError);
      expect(() => escapeForShell('')).toThrow(SecurityError);
      expect(() => escapeForSQL('')).toThrow(SecurityError);
      expect(() => escapeForGeneric('')).toThrow(SecurityError);
    });

    it('should handle whitespace-only strings', () => {
      expect(() => validateTemplateInput('   ', 'PROJECT_NAME')).toThrow(SecurityError);
      expect(() => escapeForJavaScript('   ')).toThrow(SecurityError);
    });

    it('should handle special regex characters in search patterns', () => {
      const content = 'PROJECT_NAME.test = "value"';
      const replacements = { 'PROJECT_NAME.test': 'myproject' };
      
      // Should match the literal string exactly (escaping is done internally)
      const result = secureTemplateReplace(content, replacements, 'test.js');
      expect(result).toBe('myproject = "value"');
    });

    it('should handle case sensitivity', () => {
      const content = 'PROJECT_NAME and project_name';
      const replacements = { PROJECT_NAME: 'myproject' };
      const result = secureTemplateReplace(content, replacements, 'test.txt');
      
      expect(result).toBe('myproject and project_name');
    });
  });

  describe('Security Attack Scenarios', () => {
    it('should prevent JavaScript code injection', () => {
      const injectionPayloads = [
        "test'; process.exit(1); //",
        'test"; eval("malicious"); //',
        'test`${process.env.SECRET}`',
        'test + require("fs").readFileSync("/etc/passwd")',
        'test</script><script>alert("xss")</script>'
      ];

      injectionPayloads.forEach(payload => {
        expect(() => escapeForJavaScript(payload)).toThrow(SecurityError);
      });
    });

    it('should prevent shell command injection', () => {
      const injectionPayloads = [
        'test; rm -rf /',
        'test$(rm -rf /)',
        'test`rm -rf /`',
        'test && rm -rf /',
        'test | cat /etc/passwd',
        'test > /dev/null; rm -rf /',
        'test < /etc/passwd'
      ];

      injectionPayloads.forEach(payload => {
        expect(() => escapeForShell(payload)).toThrow(SecurityError);
      });
    });

    it('should prevent SQL injection', () => {
      const injectionPayloads = [
        "test'; DROP TABLE users; --",
        'test"; DELETE FROM users; --',
        'test UNION SELECT * FROM users',
        'test/* comment */ SELECT * FROM users',
        'test; INSERT INTO users VALUES'
      ];

      injectionPayloads.forEach(payload => {
        expect(() => escapeForSQL(payload)).toThrow(SecurityError);
      });
    });

    it('should prevent path traversal attacks', () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        'test/../../../etc/passwd',
        'test/../../secret',
        '..\\..\\windows\\system32',
        'test\\..\\..\\secret'
      ];

      traversalPayloads.forEach(payload => {
        expect(() => validateTemplateInput(payload, 'PROJECT_NAME')).toThrow(SecurityError);
      });
    });

    it('should prevent null byte injection', () => {
      const nullBytePayloads = [
        'test\0.sh',
        'test\x00',
        'test\u0000',
        'test.txt\0.sh'
      ];

      nullBytePayloads.forEach(payload => {
        expect(() => validateTemplateInput(payload, 'PROJECT_NAME')).toThrow(SecurityError);
      });
    });
  });
});