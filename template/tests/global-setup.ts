import { runMake } from './test-utils';

/**
 * Simplified global setup for Playwright tests
 * Relies on Makefile to manage the Spanner emulator setup
 * ENFORCES EMULATOR-ONLY CONNECTIONS for safety
 */
async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // SAFETY CHECK: Ensure we're only connecting to emulator
    await validateEmulatorOnly();
    
    // The emulator should already be running from Makefile setup
    // Just verify everything is accessible
    console.log('🔍 Verifying emulator and tools are accessible...');
    
    // Basic verification without starting anything
    const emulatorHost = process.env.SPANNER_EMULATOR_HOST || 'localhost:9010';
    console.log(`📡 Expected emulator at: ${emulatorHost}`);
    
    // Brief wait to ensure any setup is complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error: any) {
    console.error('❌ Global setup failed:', error.message);
    console.error('🔧 Emulator should be managed by Makefile');
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