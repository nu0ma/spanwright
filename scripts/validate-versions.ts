#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadVersionConfig } from './version-config-loader';
import { VersionConfig } from '../types/version-config';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  checkedFiles: string[];
}

export async function validateAllVersions(): Promise<ValidationResult> {
  console.log('🔍 Validating version consistency across all files...\n');

  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    checkedFiles: []
  };

  try {
    const config = loadVersionConfig();
    
    // Validate schema first
    console.log('📋 Validating versions.json schema...');
    
    // Validate runtime versions consistency
    await validateRuntimeVersions(config, result);
    
    // Validate dependency versions consistency
    await validateDependencyVersions(config, result);
    
    // Validate file existence
    await validateFileExistence(result);
    
    logValidationResults(result);
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to load version config: ${error}`);
  }

  return result;
}

async function validateRuntimeVersions(config: VersionConfig, result: ValidationResult): Promise<void> {
  console.log('🔍 Validating runtime versions...');

  // Check .tool-versions
  await validateToolVersions(config, result);
  
  // Check .mise.toml
  await validateMiseConfig(config, result);
  
  // Check template/go.mod.template
  await validateGoMod(config, result);
  
  // Check package.json engines
  await validatePackageJsonEngines(config, result);
  
  // Check template/_package.json engines
  await validateTemplatePackageJsonEngines(config, result);
}

async function validateToolVersions(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = '.tool-versions';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    result.errors.push(`Missing file: ${filePath}`);
    return;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    result.checkedFiles.push(filePath);

    // Check Go version
    const goMatch = content.match(/^go (\d+\.\d+(?:\.\d+)?)$/m);
    if (goMatch) {
      if (goMatch[1] !== config.runtime.go) {
        result.errors.push(`Go version mismatch in ${filePath}: expected ${config.runtime.go}, found ${goMatch[1]}`);
      } else {
        console.log(`  ✅ Go version in ${filePath}: ${goMatch[1]}`);
      }
    } else {
      result.warnings.push(`Go version not found in ${filePath}`);
    }

    // Check Node version (if present)
    const nodeMatch = content.match(/^node (\d+\.\d+\.\d+)$/m);
    if (nodeMatch) {
      if (nodeMatch[1] !== config.runtime.node) {
        result.errors.push(`Node.js version mismatch in ${filePath}: expected ${config.runtime.node}, found ${nodeMatch[1]}`);
      } else {
        console.log(`  ✅ Node.js version in ${filePath}: ${nodeMatch[1]}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error reading ${filePath}: ${error}`);
  }
}

async function validateMiseConfig(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = '.mise.toml';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    result.warnings.push(`Optional file missing: ${filePath}`);
    return;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    result.checkedFiles.push(filePath);

    // Check Go version
    const goMatch = content.match(/^go = "(\d+\.\d+(?:\.\d+)?)"$/m);
    if (goMatch) {
      if (goMatch[1] !== config.runtime.go) {
        result.errors.push(`Go version mismatch in ${filePath}: expected ${config.runtime.go}, found ${goMatch[1]}`);
      } else {
        console.log(`  ✅ Go version in ${filePath}: ${goMatch[1]}`);
      }
    }

    // Check Node version
    const nodeMatch = content.match(/^node = "(\d+\.\d+\.\d+)"$/m);
    if (nodeMatch) {
      if (nodeMatch[1] !== config.runtime.node) {
        result.errors.push(`Node.js version mismatch in ${filePath}: expected ${config.runtime.node}, found ${nodeMatch[1]}`);
      } else {
        console.log(`  ✅ Node.js version in ${filePath}: ${nodeMatch[1]}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error reading ${filePath}: ${error}`);
  }
}

async function validateGoMod(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'template/go.mod.template';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    result.errors.push(`Missing file: ${filePath}`);
    return;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    result.checkedFiles.push(filePath);

    // Check Go version
    const goMatch = content.match(/^go (\d+\.\d+(?:\.\d+)?)$/m);
    if (goMatch) {
      if (goMatch[1] !== config.runtime.go) {
        result.errors.push(`Go version mismatch in ${filePath}: expected ${config.runtime.go}, found ${goMatch[1]}`);
      } else {
        console.log(`  ✅ Go version in ${filePath}: ${goMatch[1]}`);
      }
    } else {
      result.errors.push(`Go version not found in ${filePath}`);
    }

    // Check toolchain
    const toolchainMatch = content.match(/^toolchain go(\d+\.\d+(?:\.\d+)?)$/m);
    if (toolchainMatch) {
      if (toolchainMatch[1] !== config.runtime.go) {
        result.errors.push(`Go toolchain mismatch in ${filePath}: expected ${config.runtime.go}, found ${toolchainMatch[1]}`);
      } else {
        console.log(`  ✅ Go toolchain in ${filePath}: ${toolchainMatch[1]}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error reading ${filePath}: ${error}`);
  }
}

async function validatePackageJsonEngines(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'package.json';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    result.errors.push(`Missing file: ${filePath}`);
    return;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    const packageJson = JSON.parse(content);
    result.checkedFiles.push(filePath);

    if (packageJson.engines && packageJson.engines.node) {
      const nodeEnginePattern = packageJson.engines.node;
      const expectedPattern = `>=${config.runtime.node}`;
      
      if (nodeEnginePattern !== expectedPattern) {
        result.warnings.push(`Node.js engine requirement in ${filePath} might be outdated: expected ${expectedPattern}, found ${nodeEnginePattern}`);
      } else {
        console.log(`  ✅ Node.js engine requirement in ${filePath}: ${nodeEnginePattern}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error reading ${filePath}: ${error}`);
  }
}

async function validateTemplatePackageJsonEngines(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'template/_package.json';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    result.errors.push(`Missing file: ${filePath}`);
    return;
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    const packageJson = JSON.parse(content);
    result.checkedFiles.push(filePath);

    if (packageJson.engines && packageJson.engines.node) {
      const nodeEnginePattern = packageJson.engines.node;
      // Template can have looser requirements
      console.log(`  ℹ️  Node.js engine requirement in ${filePath}: ${nodeEnginePattern} (template can be more permissive)`);
    }

  } catch (error) {
    result.errors.push(`Error reading ${filePath}: ${error}`);
  }
}

async function validateDependencyVersions(config: VersionConfig, result: ValidationResult): Promise<void> {
  console.log('🔍 Validating dependency versions...');

  // Check Go dependencies in go.mod.template
  await validateGoModDependencies(config, result);
  
  // Check Node.js CLI dependencies
  await validateCliDependencies(config, result);
  
  // Check Node.js template dependencies
  await validateTemplateDependencies(config, result);
}

async function validateGoModDependencies(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'template/go.mod.template';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    return; // Already reported as missing
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    
    for (const [depName, expectedVersion] of Object.entries(config.dependencies.go)) {
      const depRegex = new RegExp(`^\\s+${depName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (v[\\d\\.]+)`, 'm');
      const match = content.match(depRegex);
      
      if (match) {
        if (match[1] !== expectedVersion) {
          result.errors.push(`Go dependency version mismatch for ${depName}: expected ${expectedVersion}, found ${match[1]}`);
        } else {
          console.log(`  ✅ Go dependency ${depName}: ${match[1]}`);
        }
      } else {
        result.warnings.push(`Go dependency ${depName} not found in ${filePath}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error validating Go dependencies: ${error}`);
  }
}

async function validateCliDependencies(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'package.json';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    return; // Already reported as missing
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [depName, expectedVersion] of Object.entries(config.dependencies.node.cli)) {
      if (allDeps[depName]) {
        if (allDeps[depName] !== expectedVersion) {
          result.warnings.push(`CLI dependency version mismatch for ${depName}: expected ${expectedVersion}, found ${allDeps[depName]}`);
        } else {
          console.log(`  ✅ CLI dependency ${depName}: ${allDeps[depName]}`);
        }
      } else {
        result.warnings.push(`CLI dependency ${depName} not found in ${filePath}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error validating CLI dependencies: ${error}`);
  }
}

async function validateTemplateDependencies(config: VersionConfig, result: ValidationResult): Promise<void> {
  const filePath = 'template/_package.json';
  const fullPath = join(process.cwd(), filePath);
  
  if (!existsSync(fullPath)) {
    return; // Already reported as missing
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [depName, expectedVersion] of Object.entries(config.dependencies.node.template)) {
      if (allDeps[depName]) {
        if (allDeps[depName] !== expectedVersion) {
          result.warnings.push(`Template dependency version mismatch for ${depName}: expected ${expectedVersion}, found ${allDeps[depName]}`);
        } else {
          console.log(`  ✅ Template dependency ${depName}: ${allDeps[depName]}`);
        }
      } else {
        result.warnings.push(`Template dependency ${depName} not found in ${filePath}`);
      }
    }

  } catch (error) {
    result.errors.push(`Error validating template dependencies: ${error}`);
  }
}

async function validateFileExistence(result: ValidationResult): Promise<void> {
  console.log('🔍 Validating file existence...');

  const requiredFiles = [
    'versions.json',
    '.tool-versions',
    'template/go.mod.template',
    'package.json',
    'template/_package.json'
  ];

  const optionalFiles = [
    '.mise.toml'
  ];

  for (const file of requiredFiles) {
    const fullPath = join(process.cwd(), file);
    if (!existsSync(fullPath)) {
      result.errors.push(`Required file missing: ${file}`);
    } else {
      console.log(`  ✅ Required file exists: ${file}`);
    }
  }

  for (const file of optionalFiles) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      console.log(`  ✅ Optional file exists: ${file}`);
    } else {
      console.log(`  ℹ️  Optional file missing: ${file}`);
    }
  }
}

function logValidationResults(result: ValidationResult): void {
  console.log('\n📊 Validation Results:');
  console.log(`   📁 Checked files: ${result.checkedFiles.length}`);
  console.log(`   ✅ Success: ${result.success}`);
  console.log(`   ❌ Errors: ${result.errors.length}`);
  console.log(`   ⚠️  Warnings: ${result.warnings.length}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`   ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (result.success && result.errors.length === 0) {
    console.log('\n🎉 All version consistency checks passed!');
  } else {
    console.log('\n🔧 Please fix the above issues to ensure version consistency.');
  }
}

// CLI usage
async function main(): Promise<void> {
  const result = await validateAllVersions();
  
  if (!result.success || result.errors.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}