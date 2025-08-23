import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseCommandLineArgs,
  checkForHelpAndVersion,
  showVersion,
  showHelp,
  showUsageError,
  isNonInteractiveMode,
} from '../cli';
import { CLI_FLAGS } from '../constants';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('../errors');
vi.mock('../validation');

import * as fs from 'fs';
import * as path from 'path';
import { safeExit } from '../errors';
import { isFlag } from '../validation';

const mockFs = fs as any;
const mockPath = path as any;
const mockSafeExit = safeExit as any;
const mockIsFlag = isFlag as any;

describe('CLI Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    mockSafeExit.mockImplementation(() => {
      throw new Error('safeExit called');
    });
    mockIsFlag.mockImplementation((arg: string) => arg.startsWith('-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseCommandLineArgs', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should parse project name and flags correctly', () => {
      process.argv = ['node', 'spanwright', 'my-project', '--help', '-v'];

      mockIsFlag.mockImplementation((arg: string) => arg.startsWith('-'));

      const result = parseCommandLineArgs();

      expect(result.projectName).toBe('my-project');
      expect(result.flags).toEqual(['--help', '-v']);
    });

    it('should handle no project name', () => {
      process.argv = ['node', 'spanwright', '--help'];

      mockIsFlag.mockImplementation((arg: string) => arg.startsWith('-'));

      const result = parseCommandLineArgs();

      expect(result.projectName).toBeUndefined();
      expect(result.flags).toEqual(['--help']);
    });

    it('should handle no flags', () => {
      process.argv = ['node', 'spanwright', 'my-project'];

      mockIsFlag.mockImplementation((arg: string) => arg.startsWith('-'));

      const result = parseCommandLineArgs();

      expect(result.projectName).toBe('my-project');
      expect(result.flags).toEqual([]);
    });

    it('should handle multiple arguments and find first non-flag as project name', () => {
      process.argv = ['node', 'spanwright', '--help', 'project-name', 'extra-arg'];

      mockIsFlag.mockImplementation((arg: string) => arg.startsWith('-'));

      const result = parseCommandLineArgs();

      expect(result.projectName).toBe('project-name');
      expect(result.flags).toEqual(['--help']);
    });
  });

  describe('checkForHelpAndVersion', () => {
    it('should call showVersion when version flag is present', () => {
      expect(() => checkForHelpAndVersion(['--version'])).toThrow('safeExit called');
    });

    it('should call showHelp when help flag is present', () => {
      expect(() => checkForHelpAndVersion(['--help'])).toThrow('safeExit called');
    });

    it('should handle short version flag', () => {
      expect(() => checkForHelpAndVersion(['-v'])).toThrow('safeExit called');
    });

    it('should handle short help flag', () => {
      expect(() => checkForHelpAndVersion(['-h'])).toThrow('safeExit called');
    });

    it('should not call any function when no relevant flags are present', () => {
      expect(() => checkForHelpAndVersion(['--other-flag'])).not.toThrow();
    });
  });

  describe('showVersion', () => {
    it('should display version from package.json', () => {
      const mockPackageJson = JSON.stringify({ version: '1.0.0' });
      mockFs.readFileSync.mockReturnValue(mockPackageJson);

      expect(() => showVersion()).toThrow('safeExit called');

      expect(mockPath.join).toHaveBeenCalledWith(expect.any(String), '..', 'package.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith(expect.any(String), 'utf8');
      expect(mockSafeExit).toHaveBeenCalledWith(0);
    });

    it('should handle error when reading package.json', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => showVersion()).toThrow('safeExit called');

      expect(mockSafeExit).toHaveBeenCalledWith(0);
    });

    it('should handle invalid JSON in package.json', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');

      expect(() => showVersion()).toThrow('safeExit called');

      expect(mockSafeExit).toHaveBeenCalledWith(0);
    });
  });

  describe('showHelp', () => {
    it('should display help text and exit', () => {
      expect(() => showHelp()).toThrow('safeExit called');

      expect(mockSafeExit).toHaveBeenCalledWith(0);
    });
  });

  describe('showUsageError', () => {
    it('should display usage error and exit with code 1', () => {
      expect(() => showUsageError()).toThrow('safeExit called');

      expect(mockSafeExit).toHaveBeenCalledWith(1);
    });
  });

  describe('isNonInteractiveMode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return true when CI environment variable is set', () => {
      process.env.CI = 'true';

      const result = isNonInteractiveMode([]);

      expect(result).toBe(true);
    });

    it('should return true when SPANWRIGHT_NON_INTERACTIVE is set', () => {
      process.env.SPANWRIGHT_NON_INTERACTIVE = 'true';

      const result = isNonInteractiveMode([]);

      expect(result).toBe(true);
    });

    it('should return true when non-interactive flag is present', () => {
      const result = isNonInteractiveMode([CLI_FLAGS.NON_INTERACTIVE]);

      expect(result).toBe(true);
    });

    it('should return false when no non-interactive indicators are present', () => {
      process.env.CI = 'false';
      process.env.SPANWRIGHT_NON_INTERACTIVE = 'false';

      const result = isNonInteractiveMode([]);

      expect(result).toBe(false);
    });

    it('should return false when environment variables are not set to true', () => {
      process.env.CI = 'false';
      process.env.SPANWRIGHT_NON_INTERACTIVE = 'false';

      const result = isNonInteractiveMode(['--other-flag']);

      expect(result).toBe(false);
    });

    it('should prioritize environment variables over flags', () => {
      process.env.CI = 'true';

      const result = isNonInteractiveMode([]);

      expect(result).toBe(true);
    });
  });
});
