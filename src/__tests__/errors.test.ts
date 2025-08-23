import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SpanwrightError,
  ValidationError,
  FileSystemError,
  ConfigurationError,
  handleError,
  safeExit,
} from '../errors';
import { logger } from '../logger';

// Mock logger module
vi.mock('../logger');

describe('Errors Module', () => {
  const mockLogger = logger as any;
  let mockProcessExit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.error = vi.fn();
    mockProcessExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SpanwrightError', () => {
    it('should create error with message and optional code', () => {
      const error = new SpanwrightError('Test error message', 'TEST_CODE');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('SpanwrightError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SpanwrightError);
    });

    it('should create error with message only', () => {
      const error = new SpanwrightError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.code).toBeUndefined();
      expect(error.name).toBe('SpanwrightError');
    });

    it('should be catchable as Error', () => {
      try {
        throw new SpanwrightError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(SpanwrightError);
      }
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message and field', () => {
      const error = new ValidationError('Invalid input', 'username');

      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('username');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should create validation error with message only', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.field).toBeUndefined();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should inherit from SpanwrightError', () => {
      const error = new ValidationError('Test error');

      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('FileSystemError', () => {
    it('should create filesystem error with message and path', () => {
      const error = new FileSystemError('File not found', '/path/to/file');

      expect(error.message).toBe('File not found');
      expect(error.path).toBe('/path/to/file');
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.name).toBe('FileSystemError');
      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(FileSystemError);
    });

    it('should create filesystem error with message only', () => {
      const error = new FileSystemError('File operation failed');

      expect(error.message).toBe('File operation failed');
      expect(error.path).toBeUndefined();
      expect(error.code).toBe('FILESYSTEM_ERROR');
      expect(error.name).toBe('FileSystemError');
    });

    it('should inherit from SpanwrightError', () => {
      const error = new FileSystemError('Test error');

      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(FileSystemError);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error with message and key', () => {
      const error = new ConfigurationError('Invalid configuration', 'database.host');

      expect(error.message).toBe('Invalid configuration');
      expect(error.key).toBe('database.host');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.name).toBe('ConfigurationError');
      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(ConfigurationError);
    });

    it('should create configuration error with message only', () => {
      const error = new ConfigurationError('Configuration failed');

      expect(error.message).toBe('Configuration failed');
      expect(error.key).toBeUndefined();
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should inherit from SpanwrightError', () => {
      const error = new ConfigurationError('Test error');

      expect(error).toBeInstanceOf(SpanwrightError);
      expect(error).toBeInstanceOf(ConfigurationError);
    });
  });

  describe('handleError', () => {
    it('should handle SpanwrightError', () => {
      const error = new SpanwrightError('Test spanwright error');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Test validation error', 'field');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle FileSystemError', () => {
      const error = new FileSystemError('Test filesystem error', '/path');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle ConfigurationError', () => {
      const error = new ConfigurationError('Test configuration error', 'key');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle generic Error', () => {
      const error = new Error('Generic error message');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle unknown error types', () => {
      const error = 'string error';

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle null/undefined errors', () => {
      expect(() => handleError(null)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);

      mockProcessExit.mockClear();

      expect(() => handleError(undefined)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle object errors', () => {
      const error = { message: 'Object error', code: 'OBJ_ERROR' };

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should prioritize SpanwrightError handling over generic Error', () => {
      const error = new ValidationError('Validation failed');

      expect(() => handleError(error)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('safeExit', () => {
    it('should exit with default code 0', () => {
      expect(() => safeExit()).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should exit with specified code', () => {
      expect(() => safeExit(1)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);

      mockProcessExit.mockClear();

      expect(() => safeExit(42)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(42);
    });

    it('should handle negative exit codes', () => {
      expect(() => safeExit(-1)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(-1);
    });

    it('should handle zero exit code explicitly', () => {
      expect(() => safeExit(0)).toThrow('process.exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });
  });
});
