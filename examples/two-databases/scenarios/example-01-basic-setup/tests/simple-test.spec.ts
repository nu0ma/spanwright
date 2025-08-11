import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('Simple Basic Test', () => {
  test.beforeAll(async () => {
    console.log(' Setting up test environment...');
    const dbConfig = getDatabaseConfig();
    console.log(
      ` Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`
    );
  });

  test('Sample Test', async ({ page }) => {
    // Simple page test
    await page.goto('http://example.com');
    await expect(page).toHaveTitle(/Example/);
    console.log('✅ Basic page test passed');
  });

  test('Database Validation Test', async () => {
    const dbConfig = getDatabaseConfig();

    const validation1 = validateDatabaseState('example-01-basic-setup', 'primary');
    expect(validation1).toBe(true);

    const validation2 = validateDatabaseState('example-01-basic-setup', 'secondary');
    expect(validation2).toBe(true);

    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });
});
