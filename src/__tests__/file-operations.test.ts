import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ensureDirectoryExists,
  copyDirectory,
  safeFileExists,
  safeFileDelete,
  safeFileRename,
  readFileContent,
  writeFileContent,
  escapeRegExp,
  replaceInFile,
  processTemplateFiles,
  replaceProjectNameInGoFiles,
} from '../file-operations';
import { FileSystemError, SecurityError } from '../errors';
import { FILE_PATTERNS } from '../constants';

// Mock the fs module
vi.mock('fs');

describe('File Operations Module', () => {
  let mockFs: any;

  beforeEach(() => {
    mockFs = {
      existsSync: vi.mocked(fs.existsSync),
      mkdirSync: vi.mocked(fs.mkdirSync),
      readdirSync: vi.mocked(fs.readdirSync),
      statSync: vi.mocked(fs.statSync),
      copyFileSync: vi.mocked(fs.copyFileSync),
      unlinkSync: vi.mocked(fs.unlinkSync),
      renameSync: vi.mocked(fs.renameSync),
      readFileSync: vi.mocked(fs.readFileSync),
      writeFileSync: vi.mocked(fs.writeFileSync),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      const dirPath = '/test/directory';
      mockFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists(dirPath);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should create directory idempotently', () => {
      const dirPath = '/test/directory';
      mockFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists(dirPath);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should throw FileSystemError if directory creation fails', () => {
      const dirPath = '/test/directory';
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => ensureDirectoryExists(dirPath)).toThrow(FileSystemError);
      expect(() => ensureDirectoryExists(dirPath)).toThrow(
        'Failed to create directory: /test/directory'
      );
    });

    it('should throw FileSystemError if mkdirSync throws error', () => {
      const dirPath = '/test/directory';
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => ensureDirectoryExists(dirPath)).toThrow(FileSystemError);
      expect(() => ensureDirectoryExists(dirPath)).toThrow(
        'Failed to create directory: /test/directory'
      );
    });

    it('should throw SecurityError for path traversal attempts', () => {
      const dirPath = '../../../etc';

      expect(() => ensureDirectoryExists(dirPath)).toThrow(SecurityError);
      expect(() => ensureDirectoryExists(dirPath)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for null byte injection', () => {
      const dirPath = '/test/directory\0/evil';

      expect(() => ensureDirectoryExists(dirPath)).toThrow(SecurityError);
      expect(() => ensureDirectoryExists(dirPath)).toThrow('Null byte in path detected');
    });
  });

  describe('copyDirectory', () => {
    it('should copy directory with files recursively', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false); // For ensureDirectoryExists
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockReturnValue(['file1.txt', 'subdir']);
      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => false }) // file1.txt
        .mockReturnValueOnce({ isDirectory: () => true }); // subdir
      mockFs.copyFileSync.mockReturnValue(undefined);

      // Mock recursive call
      mockFs.readdirSync.mockReturnValueOnce(['file2.txt']);
      mockFs.statSync.mockReturnValueOnce({ isDirectory: () => false });

      copyDirectory(src, dest);

      expect(mockFs.readdirSync).toHaveBeenCalledWith(src);
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        path.join(src, 'file2.txt'),
        path.join(dest, 'file2.txt')
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dest, { recursive: true });
    });

    it('should handle empty directory', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockReturnValue([]);

      copyDirectory(src, dest);

      expect(mockFs.readdirSync).toHaveBeenCalledWith(src);
      expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should throw FileSystemError if source directory cannot be read', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      expect(() => copyDirectory(src, dest)).toThrow(FileSystemError);
      expect(() => copyDirectory(src, dest)).toThrow(
        'Failed to copy directory from /source to /destination'
      );
    });

    it('should throw FileSystemError if file copy fails', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockReturnValue(['file1.txt']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false });
      mockFs.copyFileSync.mockImplementation(() => {
        throw new Error('Copy failed');
      });

      expect(() => copyDirectory(src, dest)).toThrow(FileSystemError);
      expect(() => copyDirectory(src, dest)).toThrow(
        'Failed to copy directory from /source to /destination'
      );
    });

    it('should throw FileSystemError if statSync fails', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.readdirSync.mockReturnValue(['file1.txt']);
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Stat failed');
      });

      expect(() => copyDirectory(src, dest)).toThrow(FileSystemError);
      expect(() => copyDirectory(src, dest)).toThrow(
        'Failed to copy directory from /source to /destination'
      );
    });

    it('should throw SecurityError for path traversal in source', () => {
      const src = '../../../etc/passwd';
      const dest = '/destination';

      expect(() => copyDirectory(src, dest)).toThrow(SecurityError);
      expect(() => copyDirectory(src, dest)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for path traversal in destination', () => {
      const src = '/source';
      const dest = '../../../etc/evil';

      expect(() => copyDirectory(src, dest)).toThrow(SecurityError);
      expect(() => copyDirectory(src, dest)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for path traversal in file paths during copy', () => {
      const src = '/source';
      const dest = '/destination';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      // Return a file that would traverse outside when joined
      mockFs.readdirSync.mockReturnValue(['../../../etc/passwd']);

      expect(() => copyDirectory(src, dest)).toThrow(SecurityError);
    });
  });

  describe('safeFileExists', () => {
    it('should return true if file exists', () => {
      const filePath = '/test/file.txt';
      mockFs.existsSync.mockReturnValue(true);

      const result = safeFileExists(filePath);

      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
    });

    it('should return false if file does not exist', () => {
      const filePath = '/test/file.txt';
      mockFs.existsSync.mockReturnValue(false);

      const result = safeFileExists(filePath);

      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
    });

    it('should return false if existsSync throws error', () => {
      const filePath = '/test/file.txt';
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = safeFileExists(filePath);

      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
    });
  });

  describe('safeFileDelete', () => {
    it('should delete file if it exists', () => {
      const filePath = '/test/file.txt';
      mockFs.unlinkSync.mockReturnValue(undefined);

      safeFileDelete(filePath);

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('should handle file not existing gracefully', () => {
      const filePath = '/test/file.txt';
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.unlinkSync.mockImplementation(() => {
        throw error;
      });

      expect(() => safeFileDelete(filePath)).not.toThrow();
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(filePath);
    });

    it('should throw FileSystemError if deletion fails', () => {
      const filePath = '/test/file.txt';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => safeFileDelete(filePath)).toThrow(FileSystemError);
      expect(() => safeFileDelete(filePath)).toThrow('Failed to delete file: /test/file.txt');
    });

    it('should handle existsSync errors gracefully', () => {
      const filePath = '/test/file.txt';
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => safeFileDelete(filePath)).not.toThrow();
    });

    it('should throw SecurityError for path traversal attempts', () => {
      const filePath = '../../../etc/passwd';

      expect(() => safeFileDelete(filePath)).toThrow(SecurityError);
      expect(() => safeFileDelete(filePath)).toThrow('Path traversal attempt detected');
    });
  });

  describe('safeFileRename', () => {
    it('should rename file if it exists', () => {
      const oldPath = '/test/old.txt';
      const newPath = '/test/new.txt';
      mockFs.renameSync.mockReturnValue(undefined);

      safeFileRename(oldPath, newPath);

      expect(mockFs.renameSync).toHaveBeenCalledWith(oldPath, newPath);
    });

    it('should handle file not existing for rename', () => {
      const oldPath = '/test/old.txt';
      const newPath = '/test/new.txt';
      mockFs.renameSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => safeFileRename(oldPath, newPath)).toThrow(FileSystemError);
      expect(mockFs.renameSync).toHaveBeenCalledWith(oldPath, newPath);
    });

    it('should throw FileSystemError if rename fails', () => {
      const oldPath = '/test/old.txt';
      const newPath = '/test/new.txt';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.renameSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => safeFileRename(oldPath, newPath)).toThrow(FileSystemError);
      expect(() => safeFileRename(oldPath, newPath)).toThrow(
        'Failed to rename file from /test/old.txt to /test/new.txt'
      );
    });

    it('should handle existsSync errors gracefully', () => {
      const oldPath = '/test/old.txt';
      const newPath = '/test/new.txt';
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => safeFileRename(oldPath, newPath)).not.toThrow();
    });

    it('should throw SecurityError for path traversal in old path', () => {
      const oldPath = '../../../etc/passwd';
      const newPath = '/test/new.txt';

      expect(() => safeFileRename(oldPath, newPath)).toThrow(SecurityError);
      expect(() => safeFileRename(oldPath, newPath)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for path traversal in new path', () => {
      const oldPath = '/test/old.txt';
      const newPath = '../../../etc/passwd';

      expect(() => safeFileRename(oldPath, newPath)).toThrow(SecurityError);
      expect(() => safeFileRename(oldPath, newPath)).toThrow('Path traversal attempt detected');
    });
  });

  describe('readFileContent', () => {
    it('should read file content successfully', () => {
      const filePath = '/test/file.txt';
      const content = 'Hello, World!';
      mockFs.readFileSync.mockReturnValue(content);

      const result = readFileContent(filePath);

      expect(result).toBe(content);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should throw FileSystemError if file read fails', () => {
      const filePath = '/test/file.txt';
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => readFileContent(filePath)).toThrow(FileSystemError);
      expect(() => readFileContent(filePath)).toThrow('Failed to read file: /test/file.txt');
    });

    it('should handle empty file content', () => {
      const filePath = '/test/empty.txt';
      mockFs.readFileSync.mockReturnValue('');

      const result = readFileContent(filePath);

      expect(result).toBe('');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should throw SecurityError for path traversal attempts', () => {
      const filePath = '../../../etc/passwd';

      expect(() => readFileContent(filePath)).toThrow(SecurityError);
      expect(() => readFileContent(filePath)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for absolute paths', () => {
      const filePath = '/etc/passwd';

      expect(() => readFileContent(filePath)).toThrow(SecurityError);
      expect(() => readFileContent(filePath)).toThrow('Path traversal attempt detected');
    });
  });

  describe('writeFileContent', () => {
    it('should write file content successfully', () => {
      const filePath = '/test/file.txt';
      const content = 'Hello, World!';
      mockFs.writeFileSync.mockReturnValue(undefined);

      writeFileContent(filePath, content);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, content, 'utf8');
    });

    it('should throw FileSystemError if file write fails', () => {
      const filePath = '/test/file.txt';
      const content = 'Hello, World!';
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => writeFileContent(filePath, content)).toThrow(FileSystemError);
      expect(() => writeFileContent(filePath, content)).toThrow(
        'Failed to write file: /test/file.txt'
      );
    });

    it('should handle empty content', () => {
      const filePath = '/test/empty.txt';
      const content = '';
      mockFs.writeFileSync.mockReturnValue(undefined);

      writeFileContent(filePath, content);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, content, 'utf8');
    });

    it('should throw SecurityError for path traversal attempts', () => {
      const filePath = '../../../etc/passwd';
      const content = 'malicious content';

      expect(() => writeFileContent(filePath, content)).toThrow(SecurityError);
      expect(() => writeFileContent(filePath, content)).toThrow('Path traversal attempt detected');
    });

    it('should throw SecurityError for null byte injection', () => {
      const filePath = '/test/file.txt\0.sh';
      const content = 'malicious content';

      expect(() => writeFileContent(filePath, content)).toThrow(SecurityError);
      expect(() => writeFileContent(filePath, content)).toThrow('Null byte in path detected');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape regex special characters', () => {
      const input = 'Hello.*+?^${}()|[]\\World';
      const expected = 'Hello\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\World';

      const result = escapeRegExp(input);

      expect(result).toBe(expected);
    });

    it('should return same string if no special characters', () => {
      const input = 'HelloWorld123';
      const expected = 'HelloWorld123';

      const result = escapeRegExp(input);

      expect(result).toBe(expected);
    });

    it('should handle empty string', () => {
      const input = '';
      const expected = '';

      const result = escapeRegExp(input);

      expect(result).toBe(expected);
    });

    it('should handle string with only special characters', () => {
      const input = '.*+?^${}()|[]\\';
      const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';

      const result = escapeRegExp(input);

      expect(result).toBe(expected);
    });
  });

  describe('replaceInFile', () => {
    it('should replace single occurrence in file', () => {
      const filePath = '/test/file.txt';
      const originalContent = 'Hello PROJECT_NAME!';
      const expectedContent = 'Hello MyProject!';

      mockFs.readFileSync.mockReturnValue(originalContent);
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceInFile(filePath, { PROJECT_NAME: 'MyProject' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, expectedContent, 'utf8');
    });

    it('should replace multiple occurrences in file', () => {
      const filePath = '/test/file.txt';
      const originalContent = 'Hello PROJECT_NAME! Welcome to PROJECT_NAME.';
      const expectedContent = 'Hello MyProject! Welcome to MyProject.';

      mockFs.readFileSync.mockReturnValue(originalContent);
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceInFile(filePath, { PROJECT_NAME: 'MyProject' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, expectedContent, 'utf8');
    });

    it('should handle multiple replacements', () => {
      const filePath = '/test/file.txt';
      const originalContent = 'Hello PROJECT_NAME from USER_NAME!';
      const expectedContent = 'Hello MyProject from John!';

      mockFs.readFileSync.mockReturnValue(originalContent);
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceInFile(filePath, {
        PROJECT_NAME: 'MyProject',
        USER_NAME: 'John',
      });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, expectedContent, 'utf8');
    });

    it('should handle replacement with regex special characters', () => {
      const filePath = '/test/file.txt';
      const originalContent = 'pattern.*+?^${}()|[]\\test';
      const expectedContent = 'replacedtest';

      mockFs.readFileSync.mockReturnValue(originalContent);
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceInFile(filePath, { 'pattern.*+?^${}()|[]\\': 'replaced' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, expectedContent, 'utf8');
    });

    it('should handle file with no matches', () => {
      const filePath = '/test/file.txt';
      const originalContent = 'Hello World!';
      const expectedContent = 'Hello World!';

      mockFs.readFileSync.mockReturnValue(originalContent);
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceInFile(filePath, { PROJECT_NAME: 'MyProject' });

      expect(mockFs.readFileSync).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, expectedContent, 'utf8');
    });

    it('should throw FileSystemError if file read fails', () => {
      const filePath = '/test/file.txt';
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => replaceInFile(filePath, { PROJECT_NAME: 'MyProject' })).toThrow(FileSystemError);
      expect(() => replaceInFile(filePath, { PROJECT_NAME: 'MyProject' })).toThrow(
        'Failed to read file: /test/file.txt'
      );
    });

    it('should throw FileSystemError if file write fails', () => {
      const filePath = '/test/file.txt';
      mockFs.readFileSync.mockReturnValue('Hello PROJECT_NAME!');
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => replaceInFile(filePath, { PROJECT_NAME: 'MyProject' })).toThrow(FileSystemError);
      expect(() => replaceInFile(filePath, { PROJECT_NAME: 'MyProject' })).toThrow(
        'Failed to write file: /test/file.txt'
      );
    });
  });

  describe('processTemplateFiles', () => {
    it('should rename template files and process go.mod', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock file existence checks
      mockFs.existsSync
        .mockReturnValueOnce(true) // _package.json exists
        .mockReturnValueOnce(true) // _gitignore exists
        .mockReturnValueOnce(true) // go.mod.template exists
        .mockReturnValueOnce(true) // go.mod exists after rename
        .mockReturnValueOnce(false) // expected-primary.yaml.template doesn't exist
        .mockReturnValueOnce(false); // expected-secondary.yaml.template doesn't exist

      mockFs.renameSync.mockReturnValue(undefined);
      mockFs.readFileSync.mockReturnValue('module PROJECT_NAME');
      mockFs.writeFileSync.mockReturnValue(undefined);

      processTemplateFiles(projectPath, projectName);

      // Check template file renames
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON_TEMPLATE),
        path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON)
      );
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        path.join(projectPath, FILE_PATTERNS.GITIGNORE_TEMPLATE),
        path.join(projectPath, FILE_PATTERNS.GITIGNORE)
      );
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        path.join(projectPath, FILE_PATTERNS.GO_MOD_TEMPLATE),
        path.join(projectPath, FILE_PATTERNS.GO_MOD)
      );

      // Check go.mod processing
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(projectPath, FILE_PATTERNS.GO_MOD),
        'utf8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectPath, FILE_PATTERNS.GO_MOD),
        'module my-project',
        'utf8'
      );
    });

    it('should handle missing template files gracefully', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock renameSync to throw for missing files
      mockFs.renameSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      // Should not throw error for missing template files
      expect(() => processTemplateFiles(projectPath, projectName)).not.toThrow();
    });

    it('should skip go.mod processing if file does not exist after rename', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock renameSync to succeed
      mockFs.renameSync.mockReturnValue(undefined);

      // Mock go.mod as non-existent after rename (this uses safeFileExists)
      mockFs.existsSync.mockImplementation((path: string) => {
        return !path.endsWith('go.mod');
      });

      processTemplateFiles(projectPath, projectName);

      expect(mockFs.renameSync).toHaveBeenCalledTimes(3);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle validation template files', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock template files and validation templates exist
      mockFs.existsSync
        .mockReturnValueOnce(true) // _package.json exists
        .mockReturnValueOnce(true) // _gitignore exists
        .mockReturnValueOnce(true) // go.mod.template exists
        .mockReturnValueOnce(true) // go.mod exists after rename
        .mockReturnValueOnce(true) // expected-primary.yaml.template exists
        .mockReturnValueOnce(true); // expected-secondary.yaml.template exists

      mockFs.renameSync.mockReturnValue(undefined);
      mockFs.readFileSync.mockReturnValue('module PROJECT_NAME');
      mockFs.writeFileSync.mockReturnValue(undefined);

      processTemplateFiles(projectPath, projectName);

      // Should still process normally, validation templates are preserved
      expect(mockFs.renameSync).toHaveBeenCalledTimes(3);
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('replaceProjectNameInGoFiles', () => {
    it('should replace PROJECT_NAME in Go files recursively', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock directory structure
      mockFs.readdirSync
        .mockReturnValueOnce(['main.go', 'subdir']) // root directory
        .mockReturnValueOnce(['helper.go', 'test.txt']); // subdir

      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => false }) // main.go
        .mockReturnValueOnce({ isDirectory: () => true }) // subdir
        .mockReturnValueOnce({ isDirectory: () => false }) // helper.go
        .mockReturnValueOnce({ isDirectory: () => false }); // test.txt

      mockFs.readFileSync
        .mockReturnValueOnce('package PROJECT_NAME') // main.go
        .mockReturnValueOnce('import "PROJECT_NAME/pkg"'); // helper.go

      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceProjectNameInGoFiles(projectPath, projectName);

      // Should process both Go files
      expect(mockFs.readFileSync).toHaveBeenCalledWith(path.join(projectPath, 'main.go'), 'utf8');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(projectPath, 'subdir', 'helper.go'),
        'utf8'
      );

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectPath, 'main.go'),
        'package my-project',
        'utf8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectPath, 'subdir', 'helper.go'),
        'import "my-project/pkg"',
        'utf8'
      );

      // Should not process non-Go files
      expect(mockFs.readFileSync).not.toHaveBeenCalledWith(
        path.join(projectPath, 'subdir', 'test.txt'),
        'utf8'
      );
    });

    it('should handle empty directories', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      mockFs.readdirSync.mockReturnValue([]);

      replaceProjectNameInGoFiles(projectPath, projectName);

      expect(mockFs.statSync).not.toHaveBeenCalled();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle directories with no Go files', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      mockFs.readdirSync.mockReturnValue(['readme.txt', 'config.json']);
      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => false }) // readme.txt
        .mockReturnValueOnce({ isDirectory: () => false }); // config.json

      replaceProjectNameInGoFiles(projectPath, projectName);

      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should throw FileSystemError if directory read fails', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => replaceProjectNameInGoFiles(projectPath, projectName)).toThrow(FileSystemError);
      expect(() => replaceProjectNameInGoFiles(projectPath, projectName)).toThrow(
        'Failed to process directory: /test/project'
      );
    });

    it('should throw FileSystemError if stat fails', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      mockFs.readdirSync.mockReturnValue(['main.go']);
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Stat failed');
      });

      expect(() => replaceProjectNameInGoFiles(projectPath, projectName)).toThrow(FileSystemError);
      expect(() => replaceProjectNameInGoFiles(projectPath, projectName)).toThrow(
        'Failed to process directory: /test/project'
      );
    });

    it('should handle nested directory structure', () => {
      const projectPath = '/test/project';
      const projectName = 'my-project';

      // Mock deeply nested structure
      mockFs.readdirSync
        .mockReturnValueOnce(['pkg']) // root
        .mockReturnValueOnce(['handlers']) // pkg
        .mockReturnValueOnce(['auth.go']); // pkg/handlers

      mockFs.statSync
        .mockReturnValueOnce({ isDirectory: () => true }) // pkg
        .mockReturnValueOnce({ isDirectory: () => true }) // handlers
        .mockReturnValueOnce({ isDirectory: () => false }); // auth.go

      mockFs.readFileSync.mockReturnValue('package PROJECT_NAME');
      mockFs.writeFileSync.mockReturnValue(undefined);

      replaceProjectNameInGoFiles(projectPath, projectName);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(projectPath, 'pkg', 'handlers', 'auth.go'),
        'utf8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(projectPath, 'pkg', 'handlers', 'auth.go'),
        'package my-project',
        'utf8'
      );
    });
  });
});
