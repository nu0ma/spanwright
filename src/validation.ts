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
  
  if (name.startsWith('.')) {
    throw new ValidationError('Project name cannot start with a dot', 'projectName');
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
