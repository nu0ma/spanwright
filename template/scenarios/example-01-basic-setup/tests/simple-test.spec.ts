import { test, expect } from '@playwright/test';
import { getDatabaseConfig } from '../../../tests/db-config';
import { validateDatabaseState } from '../../../tests/test-utils';

test.describe('example-01-basic-setup', () => {

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