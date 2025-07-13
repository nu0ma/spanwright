import { ValidationError } from './errors';
import { VALIDATION } from './constants';

// Input validation utilities

export function validateProjectName(name: string | undefined): asserts name is string {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Project name cannot be empty', 'projectName');
  }

  // Basic pattern matching
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new ValidationError(
      'Project name can only contain letters, numbers, hyphens, and underscores. Must start with a letter.',
      'projectName'
    );
  }
}

export function validateDatabaseCount(count: string): asserts count is '1' | '2' {
  if (!(VALIDATION.DB_COUNTS as readonly string[]).includes(count)) {
    throw new ValidationError('Database count must be 1 or 2', 'dbCount');
  }
}

export function isFlag(arg: string): boolean {
  return arg.startsWith(VALIDATION.FLAG_PREFIX);
}

export function sanitizeInput(input: string): string {
  return input.trim();
}

// Enhanced security validation functions

export function validateDatabaseName(name: string, fieldName: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }

  // Basic pattern matching
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new ValidationError(
      `${fieldName} can only contain letters, numbers, hyphens, and underscores. Must start with a letter.`,
      fieldName
    );
  }

  // Basic length limit
  if (name.length > 30) {
    throw new ValidationError(`${fieldName} must be 30 characters or less`, fieldName);
  }
}

export function validateTemplateVariable(value: string, variableName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`Template variable ${variableName} cannot be empty`, variableName);
  }

  // Basic pattern matching
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new ValidationError(
      `Template variable ${variableName} can only contain letters, numbers, hyphens, and underscores`,
      variableName
    );
  }
}

export function validateSchemaPath(path: string, fieldName: string): void {
  if (!path || path.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }

  // Basic path validation
  if (!/^[a-zA-Z0-9_./\\-]+$/.test(path)) {
    throw new ValidationError(
      `${fieldName} contains invalid characters. Only letters, numbers, dots, slashes, backslashes, hyphens, and underscores are allowed.`,
      fieldName
    );
  }
}

export function validateAllTemplateInputs(inputs: Record<string, string>): void {
  for (const [key, value] of Object.entries(inputs)) {
    validateTemplateVariable(value, key);
  }
}
