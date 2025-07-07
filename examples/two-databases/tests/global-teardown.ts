import { FullConfig } from '@playwright/test';
import { safeMakeRun } from './utils/command-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Playwright tests
 * Cleans up isolated database environments and optionally stops emulator
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up worker database configurations
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(testResultsDir)) {
      const configFiles = fs.readdirSync(testResultsDir)
        .filter(file => file.startsWith('worker-') && file.endsWith('-config.json'));
      
      console.log(`🗑️ Cleaning up ${configFiles.length} worker configurations...`);
      
      for (const configFile of configFiles) {
        const configPath = path.join(testResultsDir, configFile);
        try {
          const workerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          console.log(`🔧 Cleaned up worker ${workerConfig.workerId} (databases: ${workerConfig.primaryDbId}, ${workerConfig.secondaryDbId})`);
          
          // Remove the config file
          fs.unlinkSync(configPath);
        } catch (error: any) {
          console.warn(`⚠️ Failed to clean up config file ${configFile}:`, error.message);
        }
      }
    }
    
    // Optionally stop the emulator (controlled by environment variable)
    const stopEmulator = process.env.STOP_EMULATOR_AFTER_TESTS === 'true';
    if (stopEmulator) {
      console.log('🛑 Stopping Spanner emulator...');
      try {
        safeMakeRun('stop', [], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Emulator stopped successfully');
      } catch (error: any) {
        console.warn('⚠️ Failed to stop emulator:', error.message);
      }
    } else {
      console.log('🔄 Leaving Spanner emulator running (set STOP_EMULATOR_AFTER_TESTS=true to stop)');
    }
    
    // Database connections are automatically cleaned up by seed-injector
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error: any) {
    console.error('❌ Global teardown failed:', error.message);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;