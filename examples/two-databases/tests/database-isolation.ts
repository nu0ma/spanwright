/**
 * Simple database isolation for tests
 */

export interface DatabaseConfig {
  processId: number;
  primaryDbId: string;
  secondaryDbId: string;
}

/**
 * Gets database configuration for the current test process
 */
export function getDatabaseConfig(): DatabaseConfig {
  const processId = process.pid;
  return {
    processId,
    primaryDbId: `primary-db-${processId}`,
    secondaryDbId: `secondary-db-${processId}`,
  };
}

