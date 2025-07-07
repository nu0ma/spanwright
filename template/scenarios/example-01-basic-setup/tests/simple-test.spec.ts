import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { runMake, mockValidateDatabase } from '../../../tests/test-utils';

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
    
    // Simple mock validation
    const validation = mockValidateDatabase(dbConfig.primaryDbId);
    expect(validation.every(r => r.valid)).toBe(true);
    
    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });
});