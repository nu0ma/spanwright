import { FullConfig } from '@playwright/test';
import { safeMakeRun } from './utils/command-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global setup for Playwright tests with database isolation
 * Creates isolated database environments for parallel test execution
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Ensure Spanner emulator is running
    console.log('📡 Starting Spanner emulator...');
    safeMakeRun('start', [], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Give emulator time to fully start
    console.log('⏳ Waiting for emulator to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create isolated database configuration for each worker
    const workerCount = config.workers;
    console.log(`🔧 Setting up ${workerCount} isolated database environments...`);
    
    for (let workerId = 0; workerId < workerCount; workerId++) {
      await setupWorkerDatabase(workerId);
    }
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error: any) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}

/**
 * Sets up an isolated database environment for a specific worker
 */
async function setupWorkerDatabase(workerId: number): Promise<void> {
  console.log(`🔨 Setting up database environment for worker ${workerId}...`);
  
  // Create unique database IDs for this worker
  const primaryDbId = `primary-db-worker-${workerId}`;
  const secondaryDbId = `secondary-db-worker-${workerId}`;
  
  // Store worker database configuration
  const workerConfig = {
    workerId,
    primaryDbId,
    secondaryDbId,
    timestamp: new Date().toISOString()
  };
  
  const configPath = path.join(process.cwd(), 'test-results', `worker-${workerId}-config.json`);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(workerConfig, null, 2));
  
  console.log(`📝 Worker ${workerId} will use databases: ${primaryDbId}, ${secondaryDbId}`);
}

/**
 * Validates that scenario name is safe for database operations
 */
function validateScenarioName(scenarioName: string): string {
  if (!scenarioName) {
    throw new Error('Scenario name cannot be empty');
  }
  
  const validPattern = /^scenario-[a-zA-Z0-9-_]+$/;
  if (!validPattern.test(scenarioName)) {
    throw new Error(`Invalid scenario name: ${scenarioName}. Must match pattern 'scenario-[a-zA-Z0-9-_]+'`);
  }
  
  if (scenarioName.length > 100) {
    throw new Error('Scenario name too long (max 100 characters)');
  }
  
  return scenarioName;
}

export default globalSetup;