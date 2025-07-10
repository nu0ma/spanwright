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

// Sanitize only truly sensitive information from error messages
export function sanitizeSensitiveInfo(message: string): string {
  return message
    .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
    .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
    .replace(/api[_-]?key[=:]\s*[^\s]+/gi, 'api_key=***')
    .replace(/secret[=:]\s*[^\s]+/gi, 'secret=***')
    .replace(/bearer\s+[^\s]+/gi, 'bearer ***');
}

// Error handling utility
export function handleError(error: unknown): never {
  if (error instanceof SpanwrightError) {
    console.error(sanitizeSensitiveInfo(error.message));
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error('❌ An error occurred:', sanitizeSensitiveInfo(error.message));
    process.exit(1);
  }

  console.error('❌ An unknown error occurred');
  process.exit(1);
}

// Safe exit utility
export function safeExit(code: number = 0): never {
  process.exit(code);
}
