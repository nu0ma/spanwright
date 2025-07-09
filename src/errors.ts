// Custom error types for better error handling

export class SpanwrightError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SpanwrightError';
  }
}

export class ValidationError extends SpanwrightError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends SpanwrightError {
  constructor(
    message: string,
    public readonly path?: string
  ) {
    super(message, 'FILESYSTEM_ERROR');
    this.name = 'FileSystemError';
  }
}

export class ConfigurationError extends SpanwrightError {
  constructor(
    message: string,
    public readonly key?: string
  ) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class SecurityError extends SpanwrightError {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(message, 'SECURITY_ERROR');
    this.name = 'SecurityError';
  }
}

// Error code mapping for user-friendly messages
const ERROR_CODE_MESSAGES: Record<string, string> = {
  'ENOENT': 'Required file not found. Please check your configuration.',
  'EACCES': 'Permission denied. Please check file permissions.',
  'ENOTDIR': 'Path is not a directory. Please check your input.',
  'EISDIR': 'Path is a directory but expected a file.',
  'EMFILE': 'Too many open files. Please try again.',
  'ENOSPC': 'No space left on device.',
  'ECONNREFUSED': 'Connection refused. Please check if the service is running.',
  'ETIMEOUT': 'Operation timed out. Please try again.',
  'EADDRINUSE': 'Address already in use. Please check for conflicts.',
};

// Sensitive information patterns to remove from error messages
const SENSITIVE_PATTERNS = [
  /\/Users\/[^\/\s]+/g,  // Remove user paths
  /\/home\/[^\/\s]+/g,   // Remove home paths
  /\/tmp\/[^\/\s]+/g,    // Remove temp paths
  /\/var\/[^\/\s]+/g,    // Remove var paths
  /C:\\Users\\[^\\s]+/g, // Remove Windows user paths
  /[A-Z]:\\[^\\s]+/g,    // Remove Windows absolute paths
  /\/[^\/\s]*\.env[^\/\s]*/g, // Remove env file paths
  /password[=:]\s*[^\s]+/gi, // Remove password values
  /token[=:]\s*[^\s]+/gi,    // Remove token values
  /key[=:]\s*[^\s]+/gi,      // Remove key values
  /secret[=:]\s*[^\s]+/gi,   // Remove secret values
];

// System information patterns to remove
const SYSTEM_INFO_PATTERNS = [
  /Node\.js v[\d.]+/g,
  /npm v[\d.]+/g,
  /Platform: [^\s]+/g,
  /Architecture: [^\s]+/g,
  /OS: [^\s]+/g,
];

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  
  // Remove sensitive file paths and information
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  // Remove system information
  for (const pattern of SYSTEM_INFO_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[SYSTEM INFO]');
  }
  
  return sanitized;
}

export function getErrorCode(error: any): string {
  if (error.code) {
    return error.code;
  }
  if (error.errno) {
    return error.errno;
  }
  if (error.name) {
    return error.name;
  }
  return 'UNKNOWN_ERROR';
}

export function createUserFriendlyError(error: any): string {
  const errorCode = getErrorCode(error);
  const userMessage = ERROR_CODE_MESSAGES[errorCode];
  
  if (userMessage) {
    return userMessage;
  }
  
  // For SpanwrightError types, return the sanitized message
  if (error instanceof SpanwrightError) {
    return sanitizeErrorMessage(error.message);
  }
  
  // For other errors, provide a generic message
  return 'An error occurred. Please check your input and try again.';
}

export function logErrorSecurely(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorCode = getErrorCode(error);
  const contextStr = context ? ` [${context}]` : '';
  
  // Log full error details only in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${timestamp}]${contextStr} Error ${errorCode}:`, error);
  } else {
    // In production, log only essential information
    console.error(`[${timestamp}]${contextStr} Error ${errorCode}: ${createUserFriendlyError(error)}`);
  }
}

// Error handling utility
export function handleError(error: unknown): never {
  if (error instanceof SpanwrightError) {
    const userMessage = createUserFriendlyError(error);
    console.error(userMessage);
    
    // Log full error details securely
    logErrorSecurely(error, 'SpanwrightError');
    process.exit(1);
  }

  if (error instanceof Error) {
    const userMessage = createUserFriendlyError(error);
    console.error('❌ An error occurred:', userMessage);
    
    // Log full error details securely
    logErrorSecurely(error, 'Error');
    process.exit(1);
  }

  console.error('❌ An unknown error occurred');
  logErrorSecurely(error, 'Unknown');
  process.exit(1);
}

// Safe exit utility
export function safeExit(code: number = 0): never {
  process.exit(code);
}
