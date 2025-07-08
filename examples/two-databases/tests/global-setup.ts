import { runMake } from './test-utils';

/**
 * Simplified global setup for Playwright tests
 * Only starts the Spanner emulator - database isolation is handled per-test
 * ENFORCES EMULATOR-ONLY CONNECTIONS for safety
 */
async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // SAFETY CHECK: Ensure we're only connecting to emulator
    await validateEmulatorOnly();
    
    // Ensure Spanner emulator is running
    console.log('📡 Starting Spanner emulator...');
    runMake('start');
    
    // Give emulator time to fully start
    console.log('⏳ Waiting for emulator to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error: any) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}

/**
 * Validates that we're only connecting to the emulator to prevent production accidents
 */
async function validateEmulatorOnly(): Promise<void> {
  const emulatorHost = process.env.SPANNER_EMULATOR_HOST;
  
  // Require emulator host to be set
  if (!emulatorHost) {
    throw new Error('🚨 SPANNER_EMULATOR_HOST is required - this framework only works with emulator for safety');
  }
  
  // Validate it's pointing to localhost/127.0.0.1
  if (!emulatorHost.includes('localhost') && !emulatorHost.includes('127.0.0.1')) {
    throw new Error(`🚨 SPANNER_EMULATOR_HOST must use localhost or 127.0.0.1, got: ${emulatorHost}`);
  }
  
  // Check project/instance IDs don't look production-like
  const projectId = process.env.PROJECT_ID || 'test-project';
  const instanceId = process.env.INSTANCE_ID || 'test-instance';
  
  const productionPatterns = ['prod', 'production', 'live', 'main', 'master', 'real', 'actual', 'staging', 'stage'];
  
  for (const pattern of productionPatterns) {
    if (projectId.toLowerCase().includes(pattern)) {
      throw new Error(`🚨 PROJECT_ID '${projectId}' appears production-like (contains '${pattern}') - only test/dev allowed`);
    }
    if (instanceId.toLowerCase().includes(pattern)) {
      throw new Error(`🚨 INSTANCE_ID '${instanceId}' appears production-like (contains '${pattern}') - only test/dev allowed`);
    }
  }
  
  console.log('✅ Emulator-only validation passed');
}

export default globalSetup;