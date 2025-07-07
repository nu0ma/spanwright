import { test as base } from '@playwright/test';
import path from 'path';
import { safeExecSync, validateDatabaseId, validatePath } from '../../../../tests/utils/command-utils';

type DBValidatorFixtures = {
  validateDB: (databaseId: string, expectedPath: string) => void;
  validateAllDBs: (scenario?: string) => void;
};

export const test = base.extend<DBValidatorFixtures>({
  validateDB: async ({}, use) => {
    await use((databaseId: string, expectedPath: string) => {
      const projectRoot = path.resolve(__dirname, '../../../..');
      
      // Validate inputs
      validateDatabaseId(databaseId);
      const fullExpectedPath = validatePath(expectedPath, projectRoot);
      
      console.log(`🔍 Validating ${databaseId} with spalidate...`);
      
      try {
        // Execute spalidate command
        const output = safeExecSync(
          'spalidate',
          [
            `--project=${process.env.PROJECT_ID || 'test-project'}`,
            `--instance=${process.env.INSTANCE_ID || 'test-instance'}`,
            `--database=${databaseId}`,
            '--port=9010',
            fullExpectedPath
          ],
          {
            cwd: projectRoot,
            env: {
              ...process.env,
              SPANNER_EMULATOR_HOST: 'localhost:9010'
            },
            stdio: ['ignore', 'pipe', 'pipe'], // ignore stdin, capture stdout/stderr
            timeout: 30000, // 30 second timeout
            maxBuffer: 1024 * 1024 * 10, // allow up to 10MB output
          }
        );
        
        // Parse output
        const lines = output.trim().split('\n');
        
        // Look for success patterns (spalidate outputs "✅ All validations passed!" on success)
        const hasSuccess = lines.some(line => 
          line.includes('✅') || 
          line.includes('All validations passed') ||
          line.includes('Validation passed')
        );
        
        // Look for error patterns
        const hasError = lines.some(line => 
          line.includes('❌') || 
          line.includes('FAILED') || 
          line.includes('Validation failed') ||
          line.includes('ERROR')
        );
        
        if (hasError) {
          console.error(`❌ ${databaseId} validation failed`);
          console.error('Output:', output);
          throw new Error(`DB validation failed for ${databaseId}`);
        }
        
        if (!hasSuccess) {
          // If no success marker is found, display entire output
          console.log('Spalidate output:', output);
          console.warn('⚠️  Could not determine validation result, assuming success');
        }
        
        console.log(`✅ ${databaseId} validation passed`);
      } catch (error: any) {
        if (error.code === 'ETIMEDOUT') {
          throw new Error(`Validation timed out for ${databaseId}`);
        }
        
        if (error.status) {
          // Exit code is non-zero
          console.error(`Spalidate exited with code ${error.status}`);
          if (error.stdout) {
            console.error('stdout:', error.stdout);
          }
          if (error.stderr) {
            console.error('stderr:', error.stderr);
          }
          throw new Error(`Spalidate failed with exit code ${error.status}`);
        }
        
        throw error;
      }
    });
  },

  validateAllDBs: async ({ validateDB }, use) => {
    await use((scenario: string = 'scenario-01-basic-setup') => {
      console.log(`📋 Validating all databases for ${scenario}`);
      
      // Primary DB validation
      try {
        validateDB('primary-db', `scenarios/${scenario}/expected-primary.yaml`);
      } catch (error) {
        console.error('Primary DB validation failed:', error);
        throw error;
      }
      
      // Secondary DB validation
      try {
        validateDB('secondary-db', `scenarios/${scenario}/expected-secondary.yaml`);
      } catch (error) {
        console.error('Secondary DB validation failed:', error);
        throw error;
      }
      
      console.log('✅ All database validations passed');
    });
  },
});

export { expect } from '@playwright/test';