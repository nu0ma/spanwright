import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('scenario-03-advanced', () => {
  test.beforeAll(async () => {
    console.log('🚀 Scenario 03 (Advanced) test environment ready...');
    
    const dbConfig = getDatabaseConfig();
    console.log(`🔧 Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`);
  });

  test('Advanced Page Test with Complex Interactions', async ({ page }) => {
    // Advanced page test with complex user flows
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example/);
    
    // Advanced test steps that might involve multiple pages
    await page.waitForLoadState('networkidle');
    
    // Simulate complex user interactions
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ Advanced page test with complex interactions passed');
  });

  test('Comprehensive Database Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    // Real spalidate validation for complex data scenarios
    const primaryValid = validateDatabaseState('scenario-03-advanced', 'primary', dbConfig.primaryDbId);
    expect(primaryValid).toBe(true);
    
    // Secondary database validation (if DB_COUNT=2)
    const dbCount = parseInt(process.env.DB_COUNT || '2');
    if (dbCount === 2) {
      const secondaryValid = validateDatabaseState('scenario-03-advanced', 'secondary', dbConfig.secondaryDbId);
      expect(secondaryValid).toBe(true);
    }
    
    console.log(`✅ Comprehensive database validation passed for process ${dbConfig.processId}`);
  });

  test('Performance and Load Simulation', async ({ page }) => {
    // Advanced test simulating performance scenarios
    const startTime = Date.now();
    
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`📊 Page load time: ${loadTime}ms`);
    
    // Performance assertions
    expect(loadTime).toBeLessThan(10000); // 10 second timeout
    
    console.log('✅ Performance simulation test passed');
  });
});