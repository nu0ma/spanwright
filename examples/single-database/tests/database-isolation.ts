import * as fs from 'fs';
import * as path from 'path';
import { safeMakeRun, validateScenarioName } from './utils/command-utils';

// Cache worker ID to avoid recalculation
let cachedWorkerId: number | undefined;

/**
 * Configuration for an isolated database environment
 */
export interface WorkerDatabaseConfig {
  workerId: number;
  primaryDbId: string;
  secondaryDbId: string;
  timestamp: string;
}

/**
 * Gets the isolated database configuration for the current test worker
 * @returns The database configuration for this worker
 */
export function getWorkerDatabaseConfig(): WorkerDatabaseConfig {
  const workerId = getWorkerId();
  const configPath = path.join(process.cwd(), 'test-results', `worker-${workerId}-config.json`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Worker database configuration not found for worker ${workerId}. Did global setup run?`);
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error: any) {
    throw new Error(`Failed to read worker database configuration: ${error.message}`);
  }
}

/**
 * Gets the current worker ID from Playwright's test context
 * @returns The worker ID (0-based index)
 */
function getWorkerId(): number {
  // Return cached value if available
  if (cachedWorkerId !== undefined) {
    return cachedWorkerId;
  }
  // Debug: log all environment variables that might contain worker info
  const allEnvKeys = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('worker') || 
    key.toLowerCase().includes('parallel') || 
    key.toLowerCase().includes('test')
  );
  console.log(`🔍 Worker detection env vars: ${allEnvKeys.map(k => `${k}=${process.env[k]}`).join(', ')}`);
  
  // Try various Playwright environment variables
  const workerIndex = process.env.TEST_WORKER_INDEX || process.env.WORKER_INDEX;
  if (workerIndex !== undefined && workerIndex !== '') {
    const parsed = parseInt(workerIndex, 10);
    console.log(`🔧 Found worker ID from environment: ${parsed}`);
    cachedWorkerId = parsed;
    return parsed;
  }
  
  // Fallback: try to extract from test parallel index
  const parallelIndex = process.env.TEST_PARALLEL_INDEX || process.env.PARALLEL_INDEX;
  if (parallelIndex !== undefined && parallelIndex !== '') {
    const parsed = parseInt(parallelIndex, 10);
    console.log(`🔧 Found worker ID from parallel index: ${parsed}`);
    cachedWorkerId = parsed;
    return parsed;
  }
  
  // Generate a more robust worker ID using multiple entropy sources
  // Combines PID, timestamp, and random component for better uniqueness
  const pidComponent = Math.abs(process.pid % 1000);
  const timeComponent = Math.abs(Date.now() % 1000);
  const randomComponent = Math.abs(Math.floor(Math.random() * 1000));
  
  // XOR combine components and ensure we get a value in 0-3 range
  const combinedId = (pidComponent ^ timeComponent ^ randomComponent) % 4;
  console.log(`🔧 Generated robust worker ID (PID:${pidComponent}, Time:${timeComponent}, Random:${randomComponent}): ${combinedId}`);
  cachedWorkerId = combinedId;
  return combinedId;
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
  const config = getWorkerDatabaseConfig();
  
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
  
  console.log(`🔧 Worker ${config.workerId}: Executing make ${target} with args: ${makeArgs.join(' ')}`);
  
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
  console.log(`🚀 Worker: Setting up isolated scenario ${scenarioName}...`);
  
  try {
    executeIsolatedMakeCommand('setup-scenario', scenarioName);
    console.log(`✅ Worker: Scenario ${scenarioName} setup complete`);
  } catch (error: any) {
    console.error(`❌ Worker: Failed to setup scenario ${scenarioName}:`, error.message);
    throw error;
  }
}

/**
 * Validates isolated databases for a specific scenario
 * @param scenarioName The scenario name to validate
 */
export function validateIsolatedScenario(scenarioName: string): void {
  console.log(`🔍 Worker: Validating isolated scenario ${scenarioName}...`);
  
  try {
    executeIsolatedMakeCommand('validate-scenario', scenarioName);
    console.log(`✅ Worker: Scenario ${scenarioName} validation complete`);
  } catch (error: any) {
    console.error(`❌ Worker: Failed to validate scenario ${scenarioName}:`, error.message);
    throw error;
  }
}