import { execFileSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

export function validateDatabaseState(database: 'primary' | 'secondary', databaseId?: string): boolean {
  const stack = new Error().stack;
  const scenarioMatch = stack?.match(/scenarios\/([^/]+)\/tests/);
  if (!scenarioMatch) {
    throw new Error("Scenario not found");
  }

  const scenario = scenarioMatch[1];
  const validationFile = path.join(process.cwd(), 'scenarios', scenario, `expected-${database}.yaml`);
  if (!existsSync(validationFile)) {
    throw new Error(`Expected file not found: ${validationFile}`);
  }
  
  const config  = {
    projectId: process.env.PROJECT_ID || 'test-project',
    instanceId: process.env.INSTANCE_ID || 'test-instance',
    databaseId: databaseId || (database === 'primary' 
      ? process.env.PRIMARY_DB_ID || 'primary-db'
      : process.env.SECONDARY_DB_ID || 'secondary-db'),
    emulatorHost: process.env.SPANNER_EMULATOR_HOST || 'localhost:9010'
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
    
    console.log(`✅ Database validation passed for ${database}: ${validationFile}`);
    return true;
  } catch (error: any) {
    const errorDetails = [
      `❌ Database validation failed for ${database} database`,
      `Validation file: ${validationFile}`,
      `Command: spalidate ${spalidateArgs.join(' ')}`,
      `Database ID: ${targetDatabaseId}`,
      `Emulator: ${emulatorHost}`,
       error.stdout
    ];
    
    throw new Error(errorDetails.join('\n'));
  }
}