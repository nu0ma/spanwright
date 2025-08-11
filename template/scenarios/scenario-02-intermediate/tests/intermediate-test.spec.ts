import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('scenario-02-intermediate', () => {
  test.beforeAll(async () => {
    console.log('🚀 Scenario 02 (Intermediate) test environment ready...');
    
    const dbConfig = getDatabaseConfig();
    console.log(`🔧 Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`);
  });

  test('Intermediate Page Test', async ({ page }) => {
    // Intermediate page test with more complex interactions
    await page.goto('http://example.com');
    await expect(page).toHaveTitle(/Example/);
    
    // Additional intermediate test steps
    await page.waitForLoadState('networkidle');
    console.log('✅ Intermediate page test passed');
  });

  test('Advanced Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    // Real spalidate validation
    const primaryValid = validateDatabaseState('scenario-02-intermediate', 'primary', dbConfig.primaryDbId);
    expect(primaryValid).toBe(true);
    
    // Secondary database validation (if DB_COUNT=2)
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateDatabaseState('scenario-02-intermediate', 'secondary', dbConfig.secondaryDbId);
      expect(secondaryValid).toBe(true);
    }
    
    console.log(`✅ Advanced database validation passed for process ${dbConfig.processId}`);
  });
});