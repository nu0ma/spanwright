
import { test as base } from '@playwright/test';

type DBValidatorFixtures = {
  validateDB: (databaseId: string, expectedPath: string) => void;
  validateAllDBs: (scenario?: string) => void;
};

export const test = base.extend<DBValidatorFixtures>({
  validateDB: async ({}, use) => {
    await use((databaseId: string, expectedPath: string) => {
      console.log('Mock DB validation for', databaseId, expectedPath);
    });
  },
  validateAllDBs: async ({ validateDB }, use) => {
    await use((scenario: string = 'mock-scenario') => {
      console.log('Mock validation for all DBs', scenario);
    });
  },
});

export { expect } from '@playwright/test';
