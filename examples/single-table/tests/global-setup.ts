import { runMake } from './test-utils';

/**
 * Simplified global setup for Playwright tests
 * Only starts the Spanner emulator - database isolation is handled per-test
 */
async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
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

export default globalSetup;