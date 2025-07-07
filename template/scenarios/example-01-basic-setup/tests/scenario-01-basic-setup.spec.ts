import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/database-isolation';
import { safeMakeRun } from '../../../tests/utils/command-utils';
import { quickValidateDatabase } from '../../../tests/utils/sql-validator';

test.describe('Scenario 01: Basic Setup', () => {
  const scenarioName = 'scenario-01-basic-setup';

  test.beforeAll(async () => {
    console.log('🚀 Setting up test environment...');
    
    // Simple inline setup
    const dbConfig = getDatabaseConfig();
    console.log(`🔧 Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`);
    
    // Setup database schemas
    safeMakeRun('setup-all', [], { stdio: 'inherit', cwd: process.cwd() });
    
    console.log('✅ Test environment setup complete');
  });

  test("Login Flow", async ({ page }) => {
    // Inline seed data setup
    const dbConfig = getDatabaseConfig();
    
    // Setup minimal seed data for this test
    safeMakeRun('setup-scenario', [`SCENARIO=${scenarioName}`, `PRIMARY_DATABASE_ID=${dbConfig.primaryDbId}`, `SECONDARY_DATABASE_ID=${dbConfig.secondaryDbId}`], 
      { stdio: 'inherit', cwd: process.cwd() });
    
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill("e2e-test-user@example.com");
    await page.getByPlaceholder("Password").fill(process.env.TEST_ACCOUNT_PASSWORD ?? "");
    await page.getByRole("button", { name: "Test Login" }).click();
    await expect(page.getByText("Company List")).toBeVisible();
    await expect(page.getByText("Test Company Ltd.")).toBeVisible();
    
    // Simple database validation using SQL queries
    const validation = await quickValidateDatabase(dbConfig.primaryDbId, dbConfig.secondaryDbId);
    expect(validation.allValid).toBe(true);
  });

  test('Database Basic Validation', async () => {
    const dbConfig = getDatabaseConfig();
    
    // Simple database validation without external tools
    const validation = await quickValidateDatabase(dbConfig.primaryDbId, dbConfig.secondaryDbId);
    expect(validation.allValid).toBe(true);
    
    console.log(`✅ Database validation passed for process ${dbConfig.processId}`);
  });
});