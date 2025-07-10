import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createSecureTempDir,
  createSecureTempDirSync,
  withTempDir,
  createSecureTempFile,
} from '../secure-temp';

describe('secure-temp', () => {
  describe('createSecureTempDir', () => {
    it('should create a unique temporary directory', async () => {
      const tempDir = await createSecureTempDir();
      
      expect(tempDir).toBeTruthy();
      expect(path.isAbsolute(tempDir)).toBe(true);
      expect(tempDir.includes('spanwright-')).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
      
      // Check that it's a directory
      const stats = fs.statSync(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create directory with custom prefix', async () => {
      const tempDir = await createSecureTempDir('custom-prefix-');
      
      expect(tempDir.includes('custom-prefix-')).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should create unique directories on multiple calls', async () => {
      const tempDir1 = await createSecureTempDir();
      const tempDir2 = await createSecureTempDir();
      
      expect(tempDir1).not.toBe(tempDir2);
      expect(fs.existsSync(tempDir1)).toBe(true);
      expect(fs.existsSync(tempDir2)).toBe(true);
    });
  });

  describe('createSecureTempDirSync', () => {
    it('should create a unique temporary directory synchronously', () => {
      const tempDir = createSecureTempDirSync();
      
      expect(tempDir).toBeTruthy();
      expect(path.isAbsolute(tempDir)).toBe(true);
      expect(tempDir.includes('spanwright-')).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
      
      // Check that it's a directory
      const stats = fs.statSync(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create directory with custom prefix', () => {
      const tempDir = createSecureTempDirSync('sync-test-');
      
      expect(tempDir.includes('sync-test-')).toBe(true);
      expect(fs.existsSync(tempDir)).toBe(true);
    });
  });

  describe('withTempDir', () => {
    it('should execute function with temp directory and clean up', async () => {
      let capturedTempDir: string = '';
      
      const result = await withTempDir(async (tempDir) => {
        capturedTempDir = tempDir;
        expect(fs.existsSync(tempDir)).toBe(true);
        
        // Create a test file
        const testFile = path.join(tempDir, 'test.txt');
        fs.writeFileSync(testFile, 'test content');
        expect(fs.existsSync(testFile)).toBe(true);
        
        return 'success';
      });
      
      expect(result).toBe('success');
      expect(capturedTempDir).toBeTruthy();
      
      // Directory should be cleaned up
      expect(fs.existsSync(capturedTempDir)).toBe(false);
    });

    it('should clean up even if function throws', async () => {
      let capturedTempDir: string = '';
      
      try {
        await withTempDir(async (tempDir) => {
          capturedTempDir = tempDir;
          expect(fs.existsSync(tempDir)).toBe(true);
          
          throw new Error('Test error');
        });
      } catch (error: any) {
        expect(error.message).toBe('Test error');
      }
      
      expect(capturedTempDir).toBeTruthy();
      
      // Directory should still be cleaned up
      expect(fs.existsSync(capturedTempDir)).toBe(false);
    });

    it('should work with custom prefix', async () => {
      let capturedTempDir: string = '';
      
      await withTempDir(async (tempDir) => {
        capturedTempDir = tempDir;
        expect(tempDir.includes('custom-')).toBe(true);
      }, 'custom-');
      
      expect(fs.existsSync(capturedTempDir)).toBe(false);
    });
  });

  describe('createSecureTempFile', () => {
    it('should create a secure temporary file', async () => {
      const tempDir = await createSecureTempDir();
      
      try {
        const { fd, path: filePath } = await createSecureTempFile(tempDir);
        
        expect(filePath).toBeTruthy();
        expect(path.isAbsolute(filePath)).toBe(true);
        expect(filePath.includes('tmp-')).toBe(true);
        expect(fs.existsSync(filePath)).toBe(true);
        
        // Check file stats
        const stats = fs.statSync(filePath);
        expect(stats.isFile()).toBe(true);
        expect(stats.mode & 0o777).toBe(0o600); // Check permissions
        
        // Close the file descriptor
        await fd.close();
      } finally {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should create file with custom prefix', async () => {
      const tempDir = await createSecureTempDir();
      
      try {
        const { fd, path: filePath } = await createSecureTempFile(tempDir, 'custom-');
        
        expect(filePath.includes('custom-')).toBe(true);
        expect(fs.existsSync(filePath)).toBe(true);
        
        await fd.close();
      } finally {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should create unique files on multiple calls', async () => {
      const tempDir = await createSecureTempDir();
      
      try {
        const { fd: fd1, path: filePath1 } = await createSecureTempFile(tempDir);
        const { fd: fd2, path: filePath2 } = await createSecureTempFile(tempDir);
        
        expect(filePath1).not.toBe(filePath2);
        expect(fs.existsSync(filePath1)).toBe(true);
        expect(fs.existsSync(filePath2)).toBe(true);
        
        await fd1.close();
        await fd2.close();
      } finally {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('security properties', () => {
    it('should create directories in system temp directory', async () => {
      const tempDir = await createSecureTempDir();
      const systemTempDir = os.tmpdir();
      
      // Resolve both paths to handle symlinks
      const resolvedTempDir = fs.realpathSync(tempDir);
      const resolvedSystemTempDir = fs.realpathSync(systemTempDir);
      
      expect(resolvedTempDir.startsWith(resolvedSystemTempDir)).toBe(true);
    });

    it('should have proper directory permissions', async () => {
      const tempDir = await createSecureTempDir();
      
      try {
        const stats = fs.statSync(tempDir);
        
        // Check that it's a directory
        expect(stats.isDirectory()).toBe(true);
        
        // On Unix systems, check permissions
        if (process.platform !== 'win32') {
          const mode = stats.mode & 0o777;
          expect(mode).toBe(0o700); // Should be rwx------
        }
      } finally {
        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should generate sufficiently random directory names', async () => {
      const tempDirs = await Promise.all([
        createSecureTempDir(),
        createSecureTempDir(),
        createSecureTempDir(),
        createSecureTempDir(),
        createSecureTempDir(),
      ]);
      
      try {
        // Extract the random parts
        const randomParts = tempDirs.map(dir => path.basename(dir));
        
        // All should be different
        const uniqueParts = new Set(randomParts);
        expect(uniqueParts.size).toBe(randomParts.length);
        
        // Each should have sufficient length (prefix + random chars)
        randomParts.forEach(part => {
          expect(part.length).toBeGreaterThan(10);
        });
      } finally {
        // Clean up all directories
        tempDirs.forEach(dir => {
          fs.rmSync(dir, { recursive: true, force: true });
        });
      }
    });
  });
});