#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadVersionConfig, clearVersionConfigCache } from './version-config-loader';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  duration: number;
}

let originalVersionsContent: string = '';

function backupOriginalVersions(): void {
  const versionsPath = join(process.cwd(), 'versions.json');
  if (existsSync(versionsPath)) {
    originalVersionsContent = readFileSync(versionsPath, 'utf8');
  }
}

function restoreOriginalVersions(): void {
  if (originalVersionsContent) {
    const versionsPath = join(process.cwd(), 'versions.json');
    writeFileSync(versionsPath, originalVersionsContent, 'utf8');
    clearVersionConfigCache(); // Clear cache after restore
    console.log('\n🔄 Restored original versions.json');
  }
}

export async function runAllVersionTests(): Promise<void> {
  console.log('🧪 Running version management system tests...\n');

  const results: TestResult[] = [];
  
  // Backup original versions.json
  backupOriginalVersions();

  try {
    await runTest('Version Config Loader', testVersionConfigLoader, results);
    await runTest('Version Validation', testVersionValidation, results);
    await runTest('Version Updates (Dry Run)', testVersionUpdates, results);
    await runTest('Version Consistency Check', testVersionConsistency, results);
    await runTest('Error Handling', testErrorHandling, results);
    
    displayTestResults(results);
  } finally {
    restoreOriginalVersions();
  }
}

async function testVersionConfigLoader(): Promise<string> {
  const config = loadVersionConfig();
  
  // Test basic structure
  if (!config.meta || !config.runtime || !config.dependencies) {
    throw new Error('Invalid config structure');
  }
  
  // Test runtime versions
  if (!config.runtime.go || !config.runtime.node) {
    throw new Error('Missing runtime versions');
  }
  
  // Test dependency structure
  if (!config.dependencies.go || !config.dependencies.node) {
    throw new Error('Invalid dependency structure');
  }
  
  return 'Config loader working correctly';
}

async function testVersionValidation(): Promise<string> {
  // Run validation command
  const output = execSync('pnpm run validate-versions', { encoding: 'utf8' });
  
  if (output.includes('❌')) {
    throw new Error('Validation found errors');
  }
  
  return 'Version validation passed';
}

async function testVersionUpdates(): Promise<string> {
  // Create a test versions.json
  const testConfig = {
    meta: {
      lastUpdated: "2025-08-22",
      updatePolicy: "manual",
      schemaVersion: "1.0.0"
    },
    runtime: {
      go: "1.24.6",  // Different version for testing
      node: "22.15.2",
      pnpm: "10.15.1"
    },
    dependencies: {
      go: {
        spanner: "v1.83.0"  // Different version for testing
      },
      node: {
        cli: {
          typescript: "^5.8.4"  // Different version for testing
        },
        template: {
          "@playwright/test": "^1.41.0"  // Different version for testing
        }
      }
    },
    validation: {
      compatibility: {
        node: ">=22.15.1",
        go: ">=1.24.0"
      }
    }
  };
  
  // Write test config
  const versionsPath = join(process.cwd(), 'versions.json');
  writeFileSync(versionsPath, JSON.stringify(testConfig, null, 2), 'utf8');
  clearVersionConfigCache(); // Clear cache after update
  
  // Test that the new config loads without errors
  const config = loadVersionConfig();
  
  if (config.runtime.go !== '1.24.6') {
    throw new Error('Config update not reflected');
  }
  
  return 'Version updates working correctly';
}

async function testVersionConsistency(): Promise<string> {
  // Test that all version files are consistent with versions.json
  const config = loadVersionConfig();
  
  // Check .tool-versions
  const toolVersionsPath = join(process.cwd(), '.tool-versions');
  if (existsSync(toolVersionsPath)) {
    const content = readFileSync(toolVersionsPath, 'utf8');
    const goMatch = content.match(/^go (\d+\.\d+(?:\.\d+)?)$/m);
    
    if (goMatch && goMatch[1] !== config.runtime.go) {
      throw new Error(`Go version mismatch: .tool-versions has ${goMatch[1]}, config has ${config.runtime.go}`);
    }
  }
  
  return 'Version consistency maintained';
}

async function testErrorHandling(): Promise<string> {
  // Test invalid version format
  try {
    const invalidConfig = {
      meta: { lastUpdated: "2025-08-22", updatePolicy: "manual", schemaVersion: "1.0.0" },
      runtime: { go: "invalid.version", node: "22.15.1", pnpm: "10.15.0" },
      dependencies: { go: {}, node: { cli: {}, template: {} } },
      validation: { compatibility: { node: ">=22.15.1", go: ">=1.24.0" } }
    };
    
    const versionsPath = join(process.cwd(), 'versions.json');
    writeFileSync(versionsPath, JSON.stringify(invalidConfig, null, 2), 'utf8');
    clearVersionConfigCache(); // Clear cache after update
    
    loadVersionConfig(); // This should throw an error
    
    throw new Error('Should have thrown error for invalid version format');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid Go version format')) {
      return 'Error handling working correctly';
    }
    throw error;
  }
}

async function runTest(testName: string, testFunction: () => Promise<string>, results: TestResult[]): Promise<void> {
  const startTime = Date.now();
  
  try {
    const message = await testFunction();
    const duration = Date.now() - startTime;
    
    results.push({
      testName,
      success: true,
      message,
      duration
    });
    
    console.log(`✅ ${testName}: ${message} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    results.push({
      testName,
      success: false,
      message: errorMessage,
      duration
    });
    
    console.log(`❌ ${testName}: ${errorMessage} (${duration}ms)`);
  }
}

function displayTestResults(results: TestResult[]): void {
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passed}/${total}`);
  console.log(`   ⏱️  Total Duration: ${totalDuration}ms`);
  console.log(`   📈 Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All version management tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    
    const failedTests = results.filter(r => !r.success);
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.testName}: ${test.message}`);
    });
  }
}

// CLI usage
async function main(): Promise<void> {
  await runAllVersionTests();
}

if (require.main === module) {
  main();
}