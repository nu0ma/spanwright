import { normalize, resolve, relative, isAbsolute } from 'path';
import { SecurityError } from './errors';

/**
 * Checks if a target path is safe (doesn't escape the base directory)
 * @param basePath The base directory path
 * @param targetPath The path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isSafePath(basePath: string, targetPath: string): boolean {
  // Handle absolute paths in targetPath - treat as unsafe unless it's within basePath
  if (isAbsolute(targetPath)) {
    const normalizedBase = resolve(basePath);
    const normalizedTarget = resolve(targetPath);
    const relativePath = relative(normalizedBase, normalizedTarget);
    
    // If the absolute path doesn't start with the base path, it's unsafe
    return !relativePath.startsWith('..') && !isAbsolute(relativePath);
  }
  
  // For relative paths, resolve them against the base and check
  const normalizedBase = resolve(basePath);
  const normalizedTarget = resolve(basePath, targetPath);
  const relativePath = relative(normalizedBase, normalizedTarget);
  
  // Check if the relative path starts with '..' or is an absolute path
  return !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

/**
 * Validates a path for security issues and throws if unsafe
 * @param basePath The base directory path
 * @param targetPath The path to validate
 * @param operationName The name of the operation (for error messages)
 * @throws SecurityError if the path is unsafe
 */
export function validatePath(basePath: string, targetPath: string, operationName: string): void {
  // Check for null bytes
  if (targetPath.includes('\0')) {
    throw new SecurityError(
      `Null byte in path detected in ${operationName}: ${targetPath}`,
      targetPath
    );
  }
  
  // Check for path traversal
  if (!isSafePath(basePath, targetPath)) {
    throw new SecurityError(
      `Path traversal attempt detected in ${operationName}: ${targetPath}`,
      targetPath
    );
  }
}

/**
 * Validates that a path is safe and within a base directory
 * @param basePath The base directory
 * @param targetPath The target path to validate
 * @returns The normalized absolute path if safe
 * @throws SecurityError if the path is unsafe
 */
export function getSafePath(basePath: string, targetPath: string): string {
  validatePath(basePath, targetPath, 'getSafePath');
  return resolve(basePath, targetPath);
}

/**
 * Sanitizes a path by removing dangerous patterns
 * @param inputPath The path to sanitize
 * @returns The sanitized path
 */
export function sanitizePath(inputPath: string): string {
  // Remove null bytes and trim whitespace
  return inputPath
    .replace(/\0/g, '')
    .trim();
}