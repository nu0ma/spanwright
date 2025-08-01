import * as readline from 'readline';
import { ENV_VARS, DEFAULTS, MESSAGES } from './constants';
import { ConfigurationError, ValidationError } from './errors';
import { validateDatabaseCount, validateSchemaPath, sanitizeInput } from './validation';

export interface DatabaseConfig {
  count: '1' | '2';
  primaryDbName: string;
  primarySchemaPath: string;
  secondaryDbName?: string;
  secondarySchemaPath?: string;
}

interface ReadlineInterface {
  question(query: string): Promise<string>;
  close(): void;
}

class PromptInterface implements ReadlineInterface {
  private rl: readline.Interface;
  
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  question(query: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(query, resolve);
    });
  }
  
  close(): void {
    this.rl.close();
  }
}

export async function getConfiguration(isNonInteractive: boolean): Promise<DatabaseConfig> {
  if (isNonInteractive) {
    return getNonInteractiveConfiguration();
  } else {
    return getInteractiveConfiguration();
  }
}

function getNonInteractiveConfiguration(): DatabaseConfig {
  const dbCount = process.env[ENV_VARS.DB_COUNT] || DEFAULTS.DB_COUNT;
  const primaryDbName = process.env[ENV_VARS.PRIMARY_DB_NAME] || DEFAULTS.PRIMARY_DB_NAME;
  const primarySchemaPath = process.env[ENV_VARS.PRIMARY_SCHEMA_PATH] || DEFAULTS.PRIMARY_SCHEMA_PATH;
  const secondaryDbName = process.env[ENV_VARS.SECONDARY_DB_NAME] || DEFAULTS.SECONDARY_DB_NAME;
  const secondarySchemaPath = process.env[ENV_VARS.SECONDARY_SCHEMA_PATH] || DEFAULTS.SECONDARY_SCHEMA_PATH;
  
  try {
    validateDatabaseCount(dbCount);
  } catch {
    throw new ConfigurationError(MESSAGES.ERRORS.ENV_DB_COUNT_INVALID, ENV_VARS.DB_COUNT);
  }
  
  console.log(`🤖 Non-interactive mode: Creating project with ${dbCount} database(s)`);
  console.log(`   Primary DB: ${primaryDbName} (${primarySchemaPath})`);
  
  if (dbCount === '2') {
    console.log(`   Secondary DB: ${secondaryDbName} (${secondarySchemaPath})`);
  }
  
  return {
    count: dbCount as '1' | '2',
    primaryDbName,
    primarySchemaPath,
    secondaryDbName: dbCount === '2' ? secondaryDbName : undefined,
    secondarySchemaPath: dbCount === '2' ? secondarySchemaPath : undefined,
  };
}

async function getInteractiveConfiguration(): Promise<DatabaseConfig> {
  const prompt = new PromptInterface();
  
  try {
    // Get database count
    const dbCountInput = await prompt.question('Select number of databases (1 or 2): ');
    const dbCount = sanitizeInput(dbCountInput);
    
    try {
      validateDatabaseCount(dbCount);
    } catch {
      throw new ConfigurationError(MESSAGES.ERRORS.INVALID_DB_COUNT, 'dbCount');
    }
    
    // Get primary database configuration
    const primaryDbNameInput = await prompt.question('Primary DB name (default: primary-db): ');
    const primaryDbName = sanitizeInput(primaryDbNameInput) || DEFAULTS.PRIMARY_DB_NAME;
    
    // Get primary schema path with retry on validation failure
    let primarySchemaPath: string;
    while (true) {
      const primarySchemaPathInput = await prompt.question('Primary DB schema path: ');
      const inputPath = sanitizeInput(primarySchemaPathInput);
      
      try {
        validateSchemaPath(inputPath, 'Primary schema path');
        primarySchemaPath = inputPath;
        break;
      } catch (error) {
        if (error instanceof ValidationError) {
          console.error(`❌ ${error.message}`);
          console.log('Please try again.');
        } else {
          throw error;
        }
      }
    }
    
    const config: DatabaseConfig = {
      count: dbCount as '1' | '2',
      primaryDbName,
      primarySchemaPath,
    };
    
    // Get secondary database configuration if needed
    if (dbCount === '2') {
      const secondaryDbNameInput = await prompt.question('Secondary DB name (default: secondary-db): ');
      const secondaryDbName = sanitizeInput(secondaryDbNameInput) || DEFAULTS.SECONDARY_DB_NAME;
      
      // Get secondary schema path with retry on validation failure
      let secondarySchemaPath: string;
      while (true) {
        const secondarySchemaPathInput = await prompt.question('Secondary DB schema path: ');
        const inputPath = sanitizeInput(secondarySchemaPathInput);
        
        try {
          validateSchemaPath(inputPath, 'Secondary schema path');
          secondarySchemaPath = inputPath;
          break;
        } catch (error) {
          if (error instanceof ValidationError) {
            console.error(`❌ ${error.message}`);
            console.log('Please try again.');
          } else {
            throw error;
          }
        }
      }
      
      config.secondaryDbName = secondaryDbName;
      config.secondarySchemaPath = secondarySchemaPath;
    }
    
    return config;
  } finally {
    prompt.close();
  }
}

export function generateEnvironmentContent(config: DatabaseConfig): string {
  let envContent = `# ================================================
# Spanner E2E Testing Framework Configuration
# Copy this file to .env and adjust the settings
# ================================================

# 🔧 Database Settings
DB_COUNT=${config.count}
PRIMARY_DB_ID=${config.primaryDbName}
PRIMARY_DATABASE_ID=${config.primaryDbName}
PRIMARY_DB_SCHEMA_PATH=${config.primarySchemaPath}
PRIMARY_SCHEMA_PATH=${config.primarySchemaPath}
`;
  
  if (config.count === '2' && config.secondaryDbName && config.secondarySchemaPath) {
    envContent += `SECONDARY_DB_ID=${config.secondaryDbName}
SECONDARY_DATABASE_ID=${config.secondaryDbName}
SECONDARY_DB_SCHEMA_PATH=${config.secondarySchemaPath}
SECONDARY_SCHEMA_PATH=${config.secondarySchemaPath}
`;
  }
  
  envContent += `
# 📊 Project Settings (usually no need to change)
PROJECT_ID=${DEFAULTS.PROJECT_ID}
INSTANCE_ID=${DEFAULTS.INSTANCE_ID}

# 🚨 EMULATOR ONLY - Prevents accidental production connections
SPANNER_EMULATOR_HOST=localhost:${DEFAULTS.SPANNER_PORT}

# 🐳 Docker Settings (usually no need to change)
DOCKER_IMAGE=${DEFAULTS.DOCKER_IMAGE}
DOCKER_CONTAINER_NAME=${DEFAULTS.CONTAINER_NAME}
DOCKER_SPANNER_PORT=${DEFAULTS.SPANNER_PORT}
DOCKER_ADMIN_PORT=${DEFAULTS.ADMIN_PORT}
DOCKER_STARTUP_WAIT=${DEFAULTS.STARTUP_WAIT}
`;
  
  return envContent;
}
