import { describe, it, expect } from 'vitest';
import { isSafePath, validatePath, getSafePath, sanitizePath } from '../security';
import { SecurityError } from '../errors';
import * as path from 'path';

describe('Security Module', () => {
  describe('isSafePath', () => {
    it('should return true for safe relative paths', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, 'file.txt')).toBe(true);
      expect(isSafePath(basePath, './file.txt')).toBe(true);
      expect(isSafePath(basePath, 'subdir/file.txt')).toBe(true);
      expect(isSafePath(basePath, './subdir/file.txt')).toBe(true);
    });

    it('should return false for path traversal attempts', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, '../file.txt')).toBe(false);
      expect(isSafePath(basePath, '../../file.txt')).toBe(false);
      expect(isSafePath(basePath, '../../../etc/passwd')).toBe(false);
      expect(isSafePath(basePath, 'subdir/../../file.txt')).toBe(false);
      expect(isSafePath(basePath, './subdir/../../../file.txt')).toBe(false);
    });

    it('should return false for absolute paths', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, '/etc/passwd')).toBe(false);
      expect(isSafePath(basePath, '/home/user/other')).toBe(false);
      expect(isSafePath(basePath, 'C:\\Windows\\System32')).toBe(true); // On Unix, this is treated as relative path
    });

    it('should handle paths with multiple dots correctly', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, 'file..txt')).toBe(true);
      expect(isSafePath(basePath, 'file...txt')).toBe(true);
      expect(isSafePath(basePath, '...file')).toBe(false); // starts with dots but not .. 
      expect(isSafePath(basePath, 'dir.name/file.txt')).toBe(true);
    });

    it('should handle empty and special inputs', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, '')).toBe(true);
      expect(isSafePath(basePath, '.')).toBe(true);
      expect(isSafePath(basePath, './')).toBe(true);
    });

    it('should handle Windows-style paths', () => {
      const basePath = 'C:\\Users\\Project';
      
      expect(isSafePath(basePath, 'file.txt')).toBe(true);
      expect(isSafePath(basePath, 'subdir\\file.txt')).toBe(true);
      expect(isSafePath(basePath, '..\\file.txt')).toBe(false);
      expect(isSafePath(basePath, '..\\..\\Windows\\System32')).toBe(false);
    });
  });

  describe('validatePath', () => {
    it('should not throw for safe paths', () => {
      const basePath = '/home/user/project';
      
      expect(() => validatePath(basePath, 'file.txt', 'test')).not.toThrow();
      expect(() => validatePath(basePath, './subdir/file.txt', 'test')).not.toThrow();
      expect(() => validatePath(basePath, 'deeply/nested/file.txt', 'test')).not.toThrow();
    });

    it('should throw SecurityError for path traversal attempts', () => {
      const basePath = '/home/user/project';
      
      expect(() => validatePath(basePath, '../file.txt', 'test'))
        .toThrow(SecurityError);
      expect(() => validatePath(basePath, '../../etc/passwd', 'test'))
        .toThrow(SecurityError);
      expect(() => validatePath(basePath, '../../../root/.ssh/id_rsa', 'test'))
        .toThrow(SecurityError);
    });

    it('should throw SecurityError for absolute paths', () => {
      const basePath = '/home/user/project';
      
      expect(() => validatePath(basePath, '/etc/passwd', 'test'))
        .toThrow(SecurityError);
      expect(() => validatePath(basePath, '/root/.ssh/id_rsa', 'test'))
        .toThrow(SecurityError);
    });

    it('should throw SecurityError for null byte injection', () => {
      const basePath = '/home/user/project';
      
      expect(() => validatePath(basePath, 'file.txt\0.js', 'test'))
        .toThrow(SecurityError);
      expect(() => validatePath(basePath, 'file\0/../../etc/passwd', 'test'))
        .toThrow(SecurityError);
    });

    it('should include operation name in error message', () => {
      const basePath = '/home/user/project';
      
      try {
        validatePath(basePath, '../file.txt', 'copyFile');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError);
        expect((error as SecurityError).message).toContain('copyFile');
        expect((error as SecurityError).path).toBe('../file.txt');
      }
    });

    it('should handle complex traversal patterns', () => {
      const basePath = '/home/user/project';
      
      // These should all throw
      const maliciousPaths = [
        'subdir/../../../etc/passwd',
        './././../file.txt',
        'a/b/c/../../../../../../../etc/passwd',
        'normal/path/../../../../../../etc/passwd',
      ];
      
      // All should throw
      expect(() => validatePath(basePath, maliciousPaths[0], 'test')).toThrow(SecurityError);
      expect(() => validatePath(basePath, maliciousPaths[1], 'test')).toThrow(SecurityError);
      expect(() => validatePath(basePath, maliciousPaths[2], 'test')).toThrow(SecurityError);
      expect(() => validatePath(basePath, maliciousPaths[3], 'test')).toThrow(SecurityError);
      
      // This is actually safe (weird but safe filenames)
      expect(() => validatePath(basePath, '.../.../etc/passwd', 'test')).toThrow(SecurityError);
    });
  });

  describe('getSafePath', () => {
    it('should return normalized absolute path for safe paths', () => {
      const basePath = '/home/user/project';
      
      expect(getSafePath(basePath, 'file.txt'))
        .toBe(path.resolve(basePath, 'file.txt'));
      expect(getSafePath(basePath, './subdir/file.txt'))
        .toBe(path.resolve(basePath, './subdir/file.txt'));
    });

    it('should throw SecurityError for unsafe paths', () => {
      const basePath = '/home/user/project';
      
      expect(() => getSafePath(basePath, '../file.txt'))
        .toThrow(SecurityError);
      expect(() => getSafePath(basePath, '/etc/passwd'))
        .toThrow(SecurityError);
      expect(() => getSafePath(basePath, 'file\0.txt'))
        .toThrow(SecurityError);
    });

    it('should normalize paths correctly', () => {
      const basePath = '/home/user/project';
      
      expect(getSafePath(basePath, './././file.txt'))
        .toBe(path.resolve(basePath, 'file.txt'));
      expect(getSafePath(basePath, 'subdir/../file.txt'))
        .toBe(path.resolve(basePath, 'file.txt'));
      expect(getSafePath(basePath, './subdir/./nested/./file.txt'))
        .toBe(path.resolve(basePath, 'subdir/nested/file.txt'));
    });
  });

  describe('sanitizePath', () => {
    it('should remove null bytes', () => {
      expect(sanitizePath('file.txt\0.js')).toBe('file.txt.js');
      expect(sanitizePath('path\0/to\0/file\0.txt')).toBe('path/to/file.txt');
      expect(sanitizePath('\0\0\0')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizePath('  file.txt  ')).toBe('file.txt');
      expect(sanitizePath('\t\nfile.txt\r\n')).toBe('file.txt');
      expect(sanitizePath('   ')).toBe('');
    });

    it('should handle normal paths unchanged', () => {
      expect(sanitizePath('file.txt')).toBe('file.txt');
      expect(sanitizePath('path/to/file.txt')).toBe('path/to/file.txt');
      expect(sanitizePath('../file.txt')).toBe('../file.txt'); // Note: sanitize doesn't validate
    });

    it('should handle empty input', () => {
      expect(sanitizePath('')).toBe('');
    });

    it('should preserve special but safe characters', () => {
      expect(sanitizePath('file-name_2024.txt')).toBe('file-name_2024.txt');
      expect(sanitizePath('file (1).txt')).toBe('file (1).txt');
      expect(sanitizePath('file[bracket].txt')).toBe('file[bracket].txt');
      expect(sanitizePath('file@email.txt')).toBe('file@email.txt');
    });
  });

  describe('Edge Cases and Security Scenarios', () => {
    it('should handle symbolic link traversal attempts', () => {
      const basePath = '/home/user/project';
      
      // These patterns might be used to try to escape via symlinks
      expect(isSafePath(basePath, 'symlink/../../../etc/passwd')).toBe(false);
      expect(isSafePath(basePath, './symlink/../outside')).toBe(true); // This stays within bounds
    });

    it('should handle URL-encoded path traversal attempts', () => {
      const basePath = '/home/user/project';
      
      // Note: These won't be decoded by our function, so they're "safe" as literal filenames
      expect(isSafePath(basePath, '%2e%2e%2f')).toBe(true); // Literal filename, not traversal
      expect(isSafePath(basePath, '..%2f')).toBe(false); // Contains .. which is detected
    });

    it('should handle very long paths', () => {
      const basePath = '/home/user/project';
      const longPath = 'a/'.repeat(100) + 'file.txt';
      
      expect(() => validatePath(basePath, longPath, 'test')).not.toThrow();
    });

    it('should handle Unicode in paths', () => {
      const basePath = '/home/user/project';
      
      expect(isSafePath(basePath, '文件.txt')).toBe(true);
      expect(isSafePath(basePath, 'папка/файл.txt')).toBe(true);
      expect(isSafePath(basePath, '📁/📄.txt')).toBe(true);
      expect(isSafePath(basePath, '../文件.txt')).toBe(false);
    });

    it('should handle paths with spaces', () => {
      const basePath = '/home/user/my project';
      
      expect(isSafePath(basePath, 'my file.txt')).toBe(true);
      expect(isSafePath(basePath, 'my folder/my file.txt')).toBe(true);
      expect(isSafePath(basePath, '../my file.txt')).toBe(false);
    });
  });
});