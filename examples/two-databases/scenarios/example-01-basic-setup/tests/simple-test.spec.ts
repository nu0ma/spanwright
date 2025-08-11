import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('Simple Basic Test', () => {
  test.beforeAll(async () => {
    console.log('🚀 Setting up test environment...');

    const dbConfig = getDatabaseConfig();
    console.log(
      `🔧 Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`
    );

    // Database setup is already handled by Makefile
    // No need to run setup here - it would cause container conflicts
    console.log('✅ Using existing database setup from Makefile');
  });

  test('Basic Page Test', async ({ page }) => {
    // Simple page test
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
    console.log('✅ Basic page test passed');
  });

  test('Database Validation', async () => {
    const dbConfig = getDatabaseConfig();

    // Use the environment variable database IDs instead of process-specific ones
    const validation1 = validateDatabaseState('primary');
    expect(validation1).toBe(true);

    const validation2 = validateDatabaseState('secondary');
    expect(validation2).toBe(true);

    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });
});
