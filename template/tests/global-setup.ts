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
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify emulator is accessible
    console.log('🔍 Verifying emulator accessibility...');
    try {
      runMake('check-tools');
      console.log('✅ Prerequisites verified');
    } catch (error: any) {
      console.error('❌ Prerequisites check failed:', error.message);
      throw error;
    }
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error: any) {
    console.error('❌ Global setup failed:', error.message);
    console.error('🔧 Common issues:');
    console.error('  - Docker not running');
    console.error('  - Ports 9010/9020 already in use');
    console.error('  - wrench or spalidate not installed');
    throw error;
  }
}

export default globalSetup;