export interface DatabaseConfig {
  primaryDbId: string;
  secondaryDbId: string;
}


export function getDatabaseConfig(): DatabaseConfig {

  if (!process.env.PRIMARY_DB_ID) {
    throw new Error('PRIMARY_DB_ID is not set');
  }

  if (!process.env.SECONDARY_DB_ID) {
    throw new Error('SECONDARY_DB_ID is not set');
  }
  
  const primaryDbId = process.env.PRIMARY_DB_ID;
  const secondaryDbId = process.env.SECONDARY_DB_ID;
  
  return {
    primaryDbId,
    secondaryDbId
  };
}

