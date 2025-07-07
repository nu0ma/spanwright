import { execFileSync } from 'child_process';

/**
 * Simple test utilities
 */

// Safe command execution
export function runCommand(command: string, args: string[] = []): string {
  try {
    return execFileSync(command, args, { encoding: 'utf-8' });
  } catch (error: any) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

// Run make command
export function runMake(target: string): string {
  return runCommand('/usr/bin/make', [target]);
}

// Validate database ID format
export function validateDatabaseId(databaseId: string): void {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(databaseId)) {
    throw new Error(`Invalid database ID: ${databaseId}`);
  }
}

// Simple database validation result
export interface ValidationResult {
  table: string;
  count: number;
  valid: boolean;
}

// Mock validation for testing
export function mockValidateDatabase(databaseId: string): ValidationResult[] {
  const mockData: Record<string, number> = {
    'Companies': 1,
    'Users': 1,
    'SystemConfig': 1
  };
  
  return Object.entries(mockData).map(([table, count]) => ({
    table,
    count,
    valid: count > 0
  }));
}