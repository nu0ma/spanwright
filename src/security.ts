import { resolve, relative } from 'path';
import { SecurityError } from './errors';

/**
 * Basic path traversal check
 * @param basePath The base directory path
 * @param targetPath The path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isSafePath(basePath: string, targetPath: string): boolean {
  const normalizedBase = resolve(basePath);
  const normalizedTarget = resolve(basePath, targetPath);
  const relativePath = relative(normalizedBase, normalizedTarget);

  // Basic check for path traversal
  return !relativePath.startsWith('..') && !relativePath.includes('..');
}

/**
 * Basic path validation
 * @param basePath The base directory path
 * @param targetPath The path to validate
 * @param operationName The name of the operation (for error messages)
 * @throws SecurityError if the path is unsafe
 */
export function validatePath(basePath: string, targetPath: string, operationName: string): void {
  // Basic path traversal check
  if (!isSafePath(basePath, targetPath)) {
    throw new SecurityError(
      `Path traversal attempt detected in ${operationName}: ${targetPath}`,
      targetPath
    );
  }
}

/**
 * Gets a safe path within a base directory
 * @param basePath The base directory
 * @param targetPath The target path to validate
 * @returns The normalized absolute path if safe
 * @throws SecurityError if the path is unsafe
 */
export function getSafePath(basePath: string, targetPath: string): string {
  validatePath(basePath, targetPath, 'getSafePath');
  return resolve(basePath, targetPath);
}
