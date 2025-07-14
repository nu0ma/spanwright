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
    'Products': 1,
    'Users': 1,
    'Analytics': 1,
    'UserLogs': 1
  };
  
  return Object.entries(mockData).map(([table, count]) => ({
    table,
    count,
    valid: count > 0
  }));
}

// Real spalidate validation
export function validateDatabaseState(scenario: string, database: 'primary' | 'secondary', databaseId?: string): boolean {
  const validationFile = path.join(process.cwd(), 'scenarios', scenario, `expected-${database}.yaml`);
  
  if (!existsSync(validationFile)) {
    console.log(`⚠️ No validation file found: ${validationFile}`);
    return true; // Skip validation if file doesn't exist
  }

  const projectId = process.env.PROJECT_ID || 'test-project';
  const instanceId = process.env.INSTANCE_ID || 'test-instance';
  const targetDatabaseId = databaseId || (database === 'primary' 
    ? process.env.PRIMARY_DB_ID || 'primary-db'
    : process.env.SECONDARY_DB_ID || 'secondary-db');

  const emulatorHost = process.env.SPANNER_EMULATOR_HOST || 'localhost:9010';
  
  console.log(`🔍 Validating ${database} database:`, {
    project: projectId,
    instance: instanceId,
    database: targetDatabaseId,
    emulatorHost,
    validationFile
  });

  const spalidateArgs = [
    '--project', projectId,
    '--instance', instanceId,
    '--database', targetDatabaseId,
    '--verbose',
    validationFile
  ];
  
  const spalidateCmd = `spalidate ${spalidateArgs.join(' ')}`;
  console.log(`🔍 Executing: ${spalidateCmd}`);
  console.log(`🌐 SPANNER_EMULATOR_HOST: ${emulatorHost}`);

  try {
    const result = execFileSync('spalidate', spalidateArgs, { 
      encoding: 'utf-8',
      env: { ...process.env, SPANNER_EMULATOR_HOST: emulatorHost },
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer for long output
    });
    
    console.log(`✅ Validation passed for ${database} database`);
    console.log(`📋 Validation output:\n${result}`);
    return true;
  } catch (error: any) {
    // Build detailed error message with all spalidate output
    const errorDetails = [
      `❌ Validation failed for ${database} database`,
      `📋 Command: ${spalidateCmd}`,
      `🌐 Emulator host: ${emulatorHost}`,
      `📄 Validation file: ${validationFile}`,
      ``,
      `🔍 VALIDATION DETAILED OUTPUT:
${error.stdout || 'No stdout'}`,
      ``,
      `⚠️ ERROR OUTPUT:
${error.stderr || 'No stderr'}`,
      ``,
      `💥 Error message: ${error.message}`
    ].join('\n');
    
    throw new Error(errorDetails);
  }
}
