import { ValidationError } from './errors';
import { VALIDATION } from './constants';

// Input validation utilities

export function validateProjectName(name: string | undefined): asserts name is string {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Project name cannot be empty', 'projectName');
  }
  
  if (name.includes('/') || name.includes('\\')) {
    throw new ValidationError('Project name cannot contain path separators', 'projectName');
  }
  
  // Security: Check for path traversal attempts (must come before dot check)
  if (name.includes('..')) {
    throw new ValidationError('Project name cannot contain ".." (path traversal)', 'projectName');
  }
  
  if (name.startsWith('.')) {
    throw new ValidationError('Project name cannot start with a dot', 'projectName');
  }
  
  // Security: Check for null bytes
  if (name.includes('\0')) {
    throw new ValidationError('Project name cannot contain null bytes', 'projectName');
  }
  
  // Security: Check for absolute paths on Windows
  if (/^[a-zA-Z]:/.test(name)) {
    throw new ValidationError('Project name cannot be an absolute path', 'projectName');
  }
}

export function validateDatabaseCount(count: string): asserts count is '1' | '2' {
  if (!(VALIDATION.DB_COUNTS as readonly string[]).includes(count)) {
    throw new ValidationError('Database count must be 1 or 2', 'dbCount');
  }
}

export function validateSchemaPath(path: string, fieldName: string): void {
  if (!path || path.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  
  if (!path.startsWith('/')) {
    throw new ValidationError(`${fieldName} must be an absolute path`, fieldName);
  }
}

export function isFlag(arg: string): boolean {
  return arg.startsWith(VALIDATION.FLAG_PREFIX);
}

export function sanitizeInput(input: string): string {
  return input.trim();
}
