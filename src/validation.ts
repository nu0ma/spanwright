import { ValidationError } from './errors';
import { VALIDATION } from './constants';
import { SAFE_PATTERNS, validateTemplateInput } from './template-security';

// Input validation utilities

export function validateProjectName(name: string | undefined): asserts name is string {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Project name cannot be empty', 'projectName');
  }
  
  // Use strict pattern matching for security
  if (!SAFE_PATTERNS.PROJECT_NAME.test(name)) {
    throw new ValidationError(
      'Project name can only contain letters, numbers, hyphens, and underscores. Must start with a letter.',
      'projectName'
    );
  }
  
  // Additional security validation using template security module
  try {
    validateTemplateInput(name, 'PROJECT_NAME');
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(
        `Project name security validation failed: ${error.message}`,
        'projectName'
      );
    }
    throw error;
  }
  
  // Additional checks for common security issues
  if (name.includes('/') || name.includes('\\')) {
    throw new ValidationError('Project name cannot contain path separators', 'projectName');
  }
  
  if (name.includes('..')) {
    throw new ValidationError('Project name cannot contain ".." (path traversal)', 'projectName');
  }
  
  if (name.startsWith('.')) {
    throw new ValidationError('Project name cannot start with a dot', 'projectName');
  }
  
  if (name.includes('\0')) {
    throw new ValidationError('Project name cannot contain null bytes', 'projectName');
  }
  
  if (/^[a-zA-Z]:/.test(name)) {
    throw new ValidationError('Project name cannot be an absolute path', 'projectName');
  }
  
  // Check for common dangerous patterns
  if (name.toLowerCase().includes('exec') || name.toLowerCase().includes('eval')) {
    throw new ValidationError('Project name cannot contain potentially dangerous keywords', 'projectName');
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
  
  // Use strict pattern matching for security
  if (!SAFE_PATTERNS.DATABASE_NAME.test(name)) {
    throw new ValidationError(
      `${fieldName} can only contain letters, numbers, hyphens, and underscores. Must start with a letter.`,
      fieldName
    );
  }
  
  // Additional security validation
  try {
    validateTemplateInput(name, 'DATABASE_NAME');
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(
        `${fieldName} security validation failed: ${error.message}`,
        fieldName
      );
    }
    throw error;
  }
  
  // Database-specific length limits
  if (name.length > 30) {
    throw new ValidationError(`${fieldName} must be 30 characters or less`, fieldName);
  }
  
  // Check for SQL reserved words
  const sqlReservedWords = ['select', 'insert', 'update', 'delete', 'drop', 'create', 'alter', 'table', 'database', 'schema'];
  if (sqlReservedWords.includes(name.toLowerCase())) {
    throw new ValidationError(`${fieldName} cannot be a SQL reserved word`, fieldName);
  }
}

export function validateTemplateVariable(value: string, variableName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`Template variable ${variableName} cannot be empty`, variableName);
  }
  
  // Use generic identifier pattern for template variables
  if (!SAFE_PATTERNS.GENERIC_IDENTIFIER.test(value)) {
    throw new ValidationError(
      `Template variable ${variableName} can only contain letters, numbers, hyphens, and underscores`,
      variableName
    );
  }
  
  // Additional security validation
  try {
    validateTemplateInput(value, 'GENERIC_IDENTIFIER');
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(
        `Template variable ${variableName} security validation failed: ${error.message}`,
        variableName
      );
    }
    throw error;
  }
}

export function validateSchemaPath(path: string, fieldName: string): void {
  if (!path || path.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  
  // Enhanced path validation with security checks
  if (!SAFE_PATTERNS.SCHEMA_PATH.test(path)) {
    throw new ValidationError(
      `${fieldName} contains invalid characters. Only letters, numbers, dots, slashes, backslashes, hyphens, and underscores are allowed.`,
      fieldName
    );
  }
  
  // Additional security validation
  try {
    validateTemplateInput(path, 'SCHEMA_PATH');
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(
        `${fieldName} security validation failed: ${error.message}`,
        fieldName
      );
    }
    throw error;
  }
  
  // Path-specific security checks
  if (path.includes('..')) {
    throw new ValidationError(`${fieldName} cannot contain path traversal sequences`, fieldName);
  }
  
  if (path.includes('\0')) {
    throw new ValidationError(`${fieldName} cannot contain null bytes`, fieldName);
  }
  
  if (path.startsWith('/')) {
    throw new ValidationError(`${fieldName} must be a relative path`, fieldName);
  }
}

export function validateAllTemplateInputs(inputs: Record<string, string>): void {
  for (const [key, value] of Object.entries(inputs)) {
    try {
      validateTemplateVariable(value, key);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Template input validation failed for ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key
      );
    }
  }
}
