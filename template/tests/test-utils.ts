import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

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

// Real spalidate validation
export function validateDatabaseState(database: 'primary' | 'secondary', databaseId?: string): boolean {
  const validationFile = path.join(process.cwd(), `expected-${database}.yaml`);
  const config   = {
    projectId: process.env.PROJECT_ID || 'test-project',
    instanceId: process.env.INSTANCE_ID || 'test-instance',
    databaseId: databaseId || (database === 'primary' 
      ? process.env.PRIMARY_DB_ID || 'primary-db'
      : process.env.SECONDARY_DB_ID || 'secondary-db'),
    emulatorHost: process.env.SPANNER_EMULATOR_HOST || 'localhost:9010'
  }
  
  if (!existsSync(validationFile)) {
    return true;
  }

  const { projectId, instanceId, databaseId: targetDatabaseId, emulatorHost } = config;
  
  const spalidateArgs = [
    '--project', projectId,
    '--instance', instanceId,
    '--database', targetDatabaseId,
    '--verbose',
    validationFile
  ];
  
  try {
    execFileSync('spalidate', spalidateArgs, { 
      encoding: 'utf-8',
      env: { ...process.env, SPANNER_EMULATOR_HOST: emulatorHost },
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    
    return true;
  } catch (error: any) {
    throw new Error(`❌ Database validation failed: ${error.message}`);
  }
}