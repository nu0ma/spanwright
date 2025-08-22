#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { VersionConfig, VersionLocation, VersionUpdateResult, VersionUpdateTarget } from '../types/version-config';
import { loadVersionConfig, clearVersionConfigCache } from './version-config-loader';

const VERSION_LOCATIONS: VersionLocation[] = [
  // Runtime versions
  {
    file: '.tool-versions',
    type: 'runtime',
    patterns: [
      {
        regex: /^go \d+\.\d+(\.\d+)?$/m,
        replacement: (version: string) => `go ${version}`,
        description: 'Go version in .tool-versions'
      },
      {
        regex: /^node \d+\.\d+\.\d+$/m,
        replacement: (version: string) => `node ${version}`,
        description: 'Node.js version in .tool-versions'
      }
    ]
  },
  {
    file: '.mise.toml',
    type: 'runtime',
    patterns: [
      {
        regex: /^go = "\d+\.\d+(\.\d+)?"$/m,
        replacement: (version: string) => `go = "${version}"`,
        description: 'Go version in mise config'
      },
      {
        regex: /^node = "\d+\.\d+\.\d+"$/m,
        replacement: (version: string) => `node = "${version}"`,
        description: 'Node.js version in mise config'
      }
    ]
  },
  {
    file: 'template/go.mod.template',
    type: 'runtime',
    patterns: [
      {
        regex: /^go \d+\.\d+(\.\d+)?$/m,
        replacement: (version: string) => `go ${version}`,
        description: 'Go version in template go.mod'
      },
      {
        regex: /^toolchain go\d+\.\d+(\.\d+)?$/m,
        replacement: (version: string) => `toolchain go${version}`,
        description: 'Go toolchain in template go.mod'
      }
    ]
  },
  {
    file: 'package.json',
    type: 'runtime',
    patterns: [
      {
        regex: /"node": ">=\d+\.\d+\.\d+"/,
        replacement: (version: string) => `"node": ">=${version}"`,
        description: 'Node.js engine requirement in CLI package.json'
      }
    ]
  },
  {
    file: 'template/_package.json',
    type: 'runtime',
    patterns: [
      {
        regex: /"node": ">=\d+\.\d+\.\d+"/,
        replacement: (version: string) => `"node": ">=${version}"`,
        description: 'Node.js engine requirement in template package.json'
      }
    ]
  }
];

export async function updateRuntimeVersion(target: 'go' | 'node' | 'pnpm', newVersion: string): Promise<VersionUpdateResult> {
  console.log(`🔄 Updating ${target} version to ${newVersion}...`);

  const result: VersionUpdateResult = {
    success: true,
    updatedFiles: [],
    errors: [],
    warnings: []
  };

  // Validate version format
  if (!validateVersionFormat(target, newVersion)) {
    result.success = false;
    result.errors.push(`Invalid ${target} version format: ${newVersion}`);
    return result;
  }

  // Update versions.json first
  try {
    await updateVersionsJson(target, newVersion);
    result.updatedFiles.push('versions.json');
    clearVersionConfigCache(); // Clear cache after update
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to update versions.json: ${error}`);
    return result;
  }

  // Update target files
  for (const location of VERSION_LOCATIONS) {
    if (location.type === 'runtime') {
      const updateResult = await updateLocationFile(location, target, newVersion);
      
      if (updateResult.updated) {
        result.updatedFiles.push(location.file);
      }
      
      if (updateResult.error) {
        result.errors.push(updateResult.error);
      }
      
      if (updateResult.warning) {
        result.warnings.push(updateResult.warning);
      }
    }
  }

  logResult(result, target, newVersion);
  return result;
}

export async function updateDependencyVersion(name: string, newVersion: string, scope: 'go' | 'cli' | 'template'): Promise<VersionUpdateResult> {
  console.log(`🔄 Updating ${scope} dependency ${name} to ${newVersion}...`);

  const result: VersionUpdateResult = {
    success: true,
    updatedFiles: [],
    errors: [],
    warnings: []
  };

  // Validate version format
  if (!validateDependencyVersionFormat(scope, newVersion)) {
    result.success = false;
    result.errors.push(`Invalid ${scope} dependency version format: ${newVersion}`);
    return result;
  }

  // Update versions.json
  try {
    await updateDependencyInVersionsJson(name, newVersion, scope);
    result.updatedFiles.push('versions.json');
    clearVersionConfigCache(); // Clear cache after update
  } catch (error) {
    result.success = false;
    result.errors.push(`Failed to update versions.json: ${error}`);
    return result;
  }

  // Update corresponding files based on scope
  if (scope === 'go') {
    await updateGoModDependency(name, newVersion, result);
  } else if (scope === 'cli') {
    await updatePackageJsonDependency('package.json', name, newVersion, result);
  } else if (scope === 'template') {
    await updatePackageJsonDependency('template/_package.json', name, newVersion, result);
  }

  logResult(result, `${scope}:${name}`, newVersion);
  return result;
}

export async function updateAllVersions(): Promise<VersionUpdateResult> {
  console.log('🔄 Updating all versions from versions.json...');
  
  const config = loadVersionConfig();
  const result: VersionUpdateResult = {
    success: true,
    updatedFiles: [],
    errors: [],
    warnings: []
  };

  // Update runtime versions
  for (const [runtime, version] of Object.entries(config.runtime)) {
    if (runtime === 'go' || runtime === 'node' || runtime === 'pnpm') {
      const updateResult = await updateRuntimeVersion(runtime as 'go' | 'node' | 'pnpm', version);
      mergeResults(result, updateResult);
    }
  }

  console.log('🎉 All versions updated successfully!');
  return result;
}

async function updateLocationFile(
  location: VersionLocation, 
  target: string, 
  newVersion: string
): Promise<{ updated: boolean; error?: string; warning?: string }> {
  const filePath = join(process.cwd(), location.file);

  try {
    const content = readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileUpdated = false;

    for (const pattern of location.patterns) {
      // Check if this pattern is relevant for the target
      if (isPatternRelevantForTarget(pattern, target)) {
        const matches = content.match(pattern.regex);
        if (matches) {
          newContent = newContent.replace(pattern.regex, pattern.replacement(newVersion));
          fileUpdated = true;
          console.log(`✅ Updated ${pattern.description}`);
        }
      }
    }

    if (fileUpdated) {
      writeFileSync(filePath, newContent, 'utf8');
      return { updated: true };
    } else {
      return { 
        updated: false, 
        warning: `No ${target} version pattern found in ${location.file}` 
      };
    }
  } catch (error) {
    return { 
      updated: false, 
      error: `Error updating ${location.file}: ${error}` 
    };
  }
}

function isPatternRelevantForTarget(pattern: any, target: string): boolean {
  const description = pattern.description.toLowerCase();
  return description.includes(target.toLowerCase());
}

async function updateVersionsJson(target: string, newVersion: string): Promise<void> {
  const configPath = join(process.cwd(), 'versions.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as VersionConfig;
  
  config.runtime[target as keyof typeof config.runtime] = newVersion;
  config.meta.lastUpdated = new Date().toISOString().split('T')[0];
  
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function updateDependencyInVersionsJson(name: string, newVersion: string, scope: 'go' | 'cli' | 'template'): Promise<void> {
  const configPath = join(process.cwd(), 'versions.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as VersionConfig;
  
  if (scope === 'go') {
    config.dependencies.go[name] = newVersion;
  } else if (scope === 'cli') {
    config.dependencies.node.cli[name] = newVersion;
  } else if (scope === 'template') {
    config.dependencies.node.template[name] = newVersion;
  }
  
  config.meta.lastUpdated = new Date().toISOString().split('T')[0];
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

async function updateGoModDependency(name: string, newVersion: string, result: VersionUpdateResult): Promise<void> {
  const goModPath = join(process.cwd(), 'template/go.mod.template');
  
  try {
    const content = readFileSync(goModPath, 'utf8');
    const dependencyRegex = new RegExp(`^\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} v[\\d\\.]+`, 'm');
    
    if (dependencyRegex.test(content)) {
      const newContent = content.replace(dependencyRegex, `\t${name} ${newVersion}`);
      writeFileSync(goModPath, newContent, 'utf8');
      result.updatedFiles.push('template/go.mod.template');
      console.log(`✅ Updated Go dependency ${name} in go.mod.template`);
    } else {
      result.warnings.push(`Go dependency ${name} not found in go.mod.template`);
    }
  } catch (error) {
    result.errors.push(`Failed to update Go dependency ${name}: ${error}`);
  }
}

async function updatePackageJsonDependency(filePath: string, name: string, newVersion: string, result: VersionUpdateResult): Promise<void> {
  try {
    const content = readFileSync(filePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    let updated = false;
    
    if (packageJson.dependencies && packageJson.dependencies[name]) {
      packageJson.dependencies[name] = newVersion;
      updated = true;
    }
    
    if (packageJson.devDependencies && packageJson.devDependencies[name]) {
      packageJson.devDependencies[name] = newVersion;
      updated = true;
    }
    
    if (updated) {
      writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      result.updatedFiles.push(filePath);
      console.log(`✅ Updated Node.js dependency ${name} in ${filePath}`);
    } else {
      result.warnings.push(`Node.js dependency ${name} not found in ${filePath}`);
    }
  } catch (error) {
    result.errors.push(`Failed to update Node.js dependency ${name} in ${filePath}: ${error}`);
  }
}

function validateVersionFormat(target: string, version: string): boolean {
  switch (target) {
    case 'go':
      return /^\d+\.\d+(\.\d+)?$/.test(version);
    case 'node':
      return /^\d+\.\d+\.\d+$/.test(version);
    case 'pnpm':
      return /^\d+\.\d+\.\d+$/.test(version);
    default:
      return false;
  }
}

function validateDependencyVersionFormat(scope: string, version: string): boolean {
  switch (scope) {
    case 'go':
      return /^v?\d+\.\d+\.\d+$/.test(version);
    case 'cli':
    case 'template':
      return /^[\^~]?\d+\.\d+\.\d+$/.test(version);
    default:
      return false;
  }
}

function mergeResults(target: VersionUpdateResult, source: VersionUpdateResult): void {
  target.updatedFiles.push(...source.updatedFiles);
  target.errors.push(...source.errors);
  target.warnings.push(...source.warnings);
  target.success = target.success && source.success;
}

function logResult(result: VersionUpdateResult, target: string, version: string): void {
  if (result.success) {
    console.log(`\n🎉 Successfully updated ${target} to ${version}`);
    console.log(`📁 Updated files (${result.updatedFiles.length}):`);
    result.updatedFiles.forEach(file => console.log(`   ✅ ${file}`));
  } else {
    console.log(`\n❌ Failed to update ${target} to ${version}`);
    result.errors.forEach(error => console.log(`   ❌ ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  }

  if (result.success) {
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Run: pnpm run build`);
    console.log(`   2. Run: pnpm test`);
    console.log(`   3. Commit changes if everything works`);
  }
}

// CLI functions
function showUsage(): void {
  console.error('❌ Please provide a command');
  console.error('Usage:');
  console.error('  pnpm run version-manager update-runtime <go|node|pnpm> <version>');
  console.error('  pnpm run version-manager update-dependency <name> <version> <go|cli|template>');
  console.error('  pnpm run version-manager update-all');
}

async function handleUpdateRuntime(target: string, version: string): Promise<void> {
  if (!target || !version) {
    throw new Error('Usage: update-runtime <go|node|pnpm> <version>');
  }
  if (!['go', 'node', 'pnpm'].includes(target)) {
    throw new Error('Target must be: go, node, or pnpm');
  }
  await updateRuntimeVersion(target as 'go' | 'node' | 'pnpm', version);
}

async function handleUpdateDependency(name: string, version: string, scope: string): Promise<void> {
  if (!name || !version || !scope) {
    throw new Error('Usage: update-dependency <name> <version> <go|cli|template>');
  }
  if (!['go', 'cli', 'template'].includes(scope)) {
    throw new Error('Scope must be: go, cli, or template');
  }
  await updateDependencyVersion(name, version, scope as 'go' | 'cli' | 'template');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];
  const version = args[2];
  const scope = args[3];

  if (!command) {
    showUsage();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'update-runtime':
        await handleUpdateRuntime(target, version);
        break;

      case 'update-dependency':
        await handleUpdateDependency(target, version, scope);
        break;

      case 'update-all':
        await updateAllVersions();
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}