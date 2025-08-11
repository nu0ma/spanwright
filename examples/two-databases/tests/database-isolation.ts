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
  
  // Use environment variables if available (CI environment)
  const primaryDbId = process.env.PRIMARY_DB_ID || `primary-db-${processId}`;
  const secondaryDbId = process.env.SECONDARY_DB_ID || `secondary-db-${processId}`;
  
  return {
    processId,
    primaryDbId,
    secondaryDbId
  };
}

