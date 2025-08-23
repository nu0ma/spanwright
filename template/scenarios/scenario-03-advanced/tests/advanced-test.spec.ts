import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/db-config';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('scenario-03-advanced', () => {

  test('Comprehensive Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    const primaryValid = validateDatabaseState('primary', dbConfig.primaryDbId);
    expect(primaryValid).toBe(true);
    
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateDatabaseState('secondary', dbConfig.secondaryDbId);
      expect(secondaryValid).toBe(true);
    }
  });

  test('Performance and Load Simulation', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://example.com');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});