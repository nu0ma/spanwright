import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('example-01-basic-setup', () => {
  test('Basic Page Test', async ({ page }) => {
    await page.goto('http://example.com');
    await expect(page).toHaveTitle(/Example/);
  });

  test('Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    const primaryValid = validateDatabaseState('primary', dbConfig.primaryDbId);
    expect(primaryValid).toBe(true);
    
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateDatabaseState('secondary', dbConfig.secondaryDbId);
      expect(secondaryValid).toBe(true);
    }
  });
});