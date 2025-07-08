import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { runMake, mockValidateDatabase, validateWithSpalidate } from '../../../tests/test-utils';

test.describe('example-01-basic-setup', () => {
  test.beforeAll(async () => {
    console.log('🚀 Test environment ready...');
    
    const dbConfig = getDatabaseConfig();
    console.log(`🔧 Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`);
  });

  test('Basic Page Test', async ({ page }) => {
    // Simple page test
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
    console.log('✅ Basic page test passed');
  });

  test('Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    // Real spalidate validation
    const primaryValid = validateWithSpalidate('example-01-basic-setup', 'primary');
    expect(primaryValid).toBe(true);
    
    // Secondary database validation (if DB_COUNT=2)
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateWithSpalidate('example-01-basic-setup', 'secondary');
      expect(secondaryValid).toBe(true);
    }
    
    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });
});