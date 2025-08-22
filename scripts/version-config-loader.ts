import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { VersionConfig } from '../types/version-config';

// Cache for loaded configuration
let cachedConfig: VersionConfig | null = null;
let cachedConfigPath: string | null = null;

const CONFIG_FILE = 'versions.json';

export function loadVersionConfig(basePath?: string): VersionConfig {
  const configPath = join(basePath || process.cwd(), CONFIG_FILE);

  // Return cached config if same path
  if (cachedConfig && cachedConfigPath === configPath) {
    return cachedConfig;
  }

  if (!existsSync(configPath)) {
    throw new Error(`Version config file not found at: ${configPath}`);
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = JSON.parse(content) as VersionConfig;
    
    validateVersionConfig(config);
    
    // Cache the loaded config
    cachedConfig = config;
    cachedConfigPath = configPath;
    
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in version config: ${error.message}`);
    }
    throw error;
  }
}

export function clearVersionConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}

export function validateVersionConfig(config: VersionConfig): void {
  validateConfigSchema(config);
  validateVersionFormats(config);
  validateCompatibility(config);
}

function validateConfigSchema(config: any): void {
  const requiredFields = ['meta', 'runtime', 'dependencies', 'validation'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!config.meta.schemaVersion) {
    throw new Error('Missing schema version in meta');
  }

  if (!['automated', 'manual'].includes(config.meta.updatePolicy)) {
    throw new Error('Invalid update policy. Must be "automated" or "manual"');
  }

  const requiredRuntimeFields = ['go', 'node', 'pnpm'];
  for (const field of requiredRuntimeFields) {
    if (!config.runtime[field]) {
      throw new Error(`Missing runtime field: ${field}`);
    }
  }
}

function validateVersionFormats(config: VersionConfig): void {
  // Validate Go version format
  if (!isValidGoVersion(config.runtime.go)) {
    throw new Error(`Invalid Go version format: ${config.runtime.go}`);
  }

  // Validate Node.js version format
  if (!isValidNodeVersion(config.runtime.node)) {
    throw new Error(`Invalid Node.js version format: ${config.runtime.node}`);
  }

  // Validate semantic versions for dependencies
  Object.entries(config.dependencies.go).forEach(([name, version]) => {
    if (!isValidGoModVersion(version)) {
      throw new Error(`Invalid Go dependency version for ${name}: ${version}`);
    }
  });

  Object.entries(config.dependencies.node.cli).forEach(([name, version]) => {
    if (!isValidNpmVersion(version)) {
      throw new Error(`Invalid CLI dependency version for ${name}: ${version}`);
    }
  });

  Object.entries(config.dependencies.node.template).forEach(([name, version]) => {
    if (!isValidNpmVersion(version)) {
      throw new Error(`Invalid template dependency version for ${name}: ${version}`);
    }
  });
}

function validateCompatibility(config: VersionConfig): void {
  const nodeVersion = config.runtime.node;
  const nodeMajor = parseInt(nodeVersion.split('.')[0]);
  
  if (nodeMajor < 20) {
    console.warn(`⚠️  Node.js ${nodeVersion} may not be compatible with all features. Minimum recommended: 20.0.0`);
  }

  const goVersion = config.runtime.go;
  const goMajorMinor = goVersion.match(/^(\d+)\.(\d+)/);
  if (!goMajorMinor) {
    throw new Error(`Cannot parse Go version: ${goVersion}`);
  }

  const goMajor = parseInt(goMajorMinor[1]);
  const goMinor = parseInt(goMajorMinor[2]);
  
  if (goMajor === 1 && goMinor < 23) {
    console.warn(`⚠️  Go ${goVersion} may not be compatible. Minimum recommended: 1.23.0`);
  }
}

function isValidGoVersion(version: string): boolean {
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

function isValidNodeVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function isValidGoModVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(version);
}

function isValidNpmVersion(version: string): boolean {
  return /^[\^~]?\d+\.\d+\.\d+$/.test(version);
}

// Convenience getter functions
export function getGoVersion(config?: VersionConfig): string {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.runtime.go;
}

export function getNodeVersion(config?: VersionConfig): string {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.runtime.node;
}

export function getPnpmVersion(config?: VersionConfig): string {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.runtime.pnpm;
}

export function getGoDependency(name: string, config?: VersionConfig): string | undefined {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.dependencies.go[name];
}

export function getCliDependency(name: string, config?: VersionConfig): string | undefined {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.dependencies.node.cli[name];
}

export function getTemplateDependency(name: string, config?: VersionConfig): string | undefined {
  const versionConfig = config || loadVersionConfig();
  return versionConfig.dependencies.node.template[name];
}