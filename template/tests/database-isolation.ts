import { safeMakeRun, validateScenarioName } from './utils/command-utils';

/**
 * Configuration for an isolated database environment
 */
export interface DatabaseConfig {
  processId: number;
  primaryDbId: string;
  secondaryDbId: string;
}

/**
 * Gets the simplified database configuration for the current test process
 * @returns The database configuration for this process
 */
export function getDatabaseConfig(): DatabaseConfig {
  const processId = process.pid;
  const primaryDbId = `primary-db-${processId}`;
  const secondaryDbId = `secondary-db-${processId}`;
  
  return {
    processId,
    primaryDbId,
    secondaryDbId
  };
}

/**
 * Safely executes a make command with isolated database configuration
 * @param target The make target to execute
 * @param scenarioName The scenario name
 * @param additionalArgs Additional arguments
 */
export function executeIsolatedMakeCommand(
  target: string, 
  scenarioName: string, 
  additionalArgs: Record<string, string> = {}
): void {
  const config = getDatabaseConfig();
  
  // Validate inputs
  if (!target || !/^[a-zA-Z-]+$/.test(target)) {
    throw new Error(`Invalid make target: ${target}`);
  }
  
  // Validate scenario name using the utility function
  validateScenarioName(scenarioName);
  
  // Build safe command arguments
  const makeArgs: string[] = [];
  
  // Add scenario argument
  makeArgs.push(`SCENARIO=${scenarioName}`);
  
  // Add database IDs
  makeArgs.push(`PRIMARY_DATABASE_ID=${config.primaryDbId}`);
  makeArgs.push(`SECONDARY_DATABASE_ID=${config.secondaryDbId}`);
  
  // Add additional arguments
  for (const [key, value] of Object.entries(additionalArgs)) {
    if (!/^[A-Z_]+$/.test(key)) {
      throw new Error(`Invalid argument key: ${key}`);
    }
    makeArgs.push(`${key}=${value}`);
  }
  
  console.log(`🔧 Process ${config.processId}: Executing make ${target} with args: ${makeArgs.join(' ')}`);
  
  // Execute command using the safe utility
  try {
    safeMakeRun(target, makeArgs, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error: any) {
    throw new Error(`Make command failed: ${error.message}`);
  }
}

/**
 * Sets up isolated databases for a specific scenario
 * @param scenarioName The scenario name to set up
 */
export function setupIsolatedScenario(scenarioName: string): void {
  console.log(`🚀 Setting up isolated scenario ${scenarioName}...`);
  
  try {
    executeIsolatedMakeCommand('setup-scenario', scenarioName);
    console.log(`✅ Scenario ${scenarioName} setup complete`);
  } catch (error: any) {
    console.error(`❌ Failed to setup scenario ${scenarioName}:`, error.message);
    throw error;
  }
}

/**
 * Validates isolated databases for a specific scenario
 * @param scenarioName The scenario name to validate
 */
export function validateIsolatedScenario(scenarioName: string): void {
  console.log(`🔍 Validating isolated scenario ${scenarioName}...`);
  
  try {
    executeIsolatedMakeCommand('validate-scenario', scenarioName);
    console.log(`✅ Scenario ${scenarioName} validation complete`);
  } catch (error: any) {
    console.error(`❌ Failed to validate scenario ${scenarioName}:`, error.message);
    throw error;
  }
}