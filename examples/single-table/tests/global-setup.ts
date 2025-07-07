import { runMake } from './test-utils';
import { execSync } from 'child_process';

/**
 * Simplified global setup for Playwright tests
 * Only starts the Spanner emulator - database isolation is handled per-test
 */
async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Check if emulator is already running to avoid conflicts
    console.log('🔍 Checking if Spanner emulator is already running...');
    try {
      const runningContainers = execSync('docker ps --format "{{.Names}}" | grep spanner-emulator', { encoding: 'utf-8' });
      if (runningContainers.trim()) {
        console.log('✅ Spanner emulator is already running, skipping start');
      } else {
        console.log('📡 Starting Spanner emulator...');
        runMake('start');
      }
    } catch (error) {
      // No containers found, start the emulator
      console.log('📡 Starting Spanner emulator...');
      runMake('start');
    }
    
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