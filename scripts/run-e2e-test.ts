#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

/**
 * Complete automated E2E test script
 * Automates full E2E test execution in testbed environment
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const TESTBED_DIR = path.join(PROJECT_ROOT, 'dev-testbed');
const TESTBED_PROJECT_PATH = path.join(TESTBED_DIR, 'spanwright-testbed');

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
}

class E2ETestRunner {
  private startTime: number;

  constructor() {
    this.log('Starting complete automated E2E test execution...');
    this.startTime = Date.now();
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Calculate elapsed time
   */
  private getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}m${seconds}s`;
  }

  /**
   * Command execution helper
   */
  private runCommand(command: string, options: Record<string, unknown> = {}): CommandResult {
    const defaultOptions = {
      cwd: TESTBED_PROJECT_PATH,
      stdio: 'inherit',
      timeout: 300000, // 5 minute timeout
      ...options,
    };

    try {
      this.log(`Executing command: ${command}`);
      // Parse command into executable and args for security
      const [executable, ...args] = command.split(' ');
      const result = execFileSync(executable, args, {
        cwd: defaultOptions.cwd as string,
        timeout: defaultOptions.timeout as number,
        encoding: 'utf8',
      });
      return { success: true, output: result || '' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { status?: number }).status || 1;
      return {
        success: false,
        error: message,
        code,
      };
    }
  }

  /**
   * Check Docker environment
   */
  checkDocker(): void {
    this.log('Checking Docker environment...');

    const result = this.runCommand('docker --version', { stdio: 'pipe' });
    if (!result.success) {
      throw new Error(
        'Docker is not available. Please ensure Docker Desktop is installed and running.'
      );
    }

    this.log('Docker environment check completed');
  }

  /**
   * Check prerequisites
   */
  checkPrerequisites(): void {
    this.log('Checking prerequisites...');

    // Check if testbed exists
    if (!fs.existsSync(TESTBED_PROJECT_PATH)) {
      throw new Error(
        `Testbed not found: ${TESTBED_PROJECT_PATH}\nPlease run 'npm run dev:create-testbed' first.`
      );
    }

    // Check Docker
    this.checkDocker();

    // Check wrench (will be checked by Makefile, but check here as well)
    const wrenchResult = this.runCommand('which wrench', { stdio: 'pipe' });
    if (!wrenchResult.success) {
      throw new Error(
        'wrench not found.\nInstall with: go install github.com/cloudspannerecosystem/wrench@latest'
      );
    }

    this.log('Prerequisites check completed');
  }

  /**
   * Initialize testbed
   */
  async initializeTestbed(): Promise<void> {
    this.log('Initializing testbed...');

    // Run make init (.env file check and Playwright setup)
    const initResult = this.runCommand('make init');
    if (!initResult.success) {
      throw new Error(`Testbed initialization error: ${initResult.error}`);
    }

    this.log('Testbed initialization completed');
  }

  /**
   * Start Spanner emulator
   */
  async startSpannerEmulator(): Promise<void> {
    this.log('Starting Spanner emulator...');

    // Stop and remove existing containers
    this.runCommand('make stop');

    // Start emulator
    const startResult = this.runCommand('make start');
    if (!startResult.success) {
      throw new Error(`Spanner emulator startup error: ${startResult.error}`);
    }

    // Wait for emulator to stabilize
    this.log('Waiting for emulator to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.log('Spanner emulator startup completed');
  }

  /**
   * Setup database schemas
   */
  async setupDatabaseSchemas(): Promise<void> {
    this.log('Setting up database schemas...');

    const setupResult = this.runCommand('make setup');
    if (!setupResult.success) {
      throw new Error(`Schema setup error: ${setupResult.error}`);
    }

    this.log('Database schema setup completed');
  }

  /**
   * Run scenario-based tests
   */
  async runScenarioTests(): Promise<void> {
    this.log('Running scenario-based tests...');

    // Run all scenarios
    const runAllResult = this.runCommand('make run-all-scenarios');
    if (!runAllResult.success) {
      throw new Error(`Scenario test error: ${runAllResult.error}`);
    }

    this.log('Scenario-based tests completed');
  }

  /**
   * Run Playwright E2E tests
   */
  async runPlaywrightTests(): Promise<void> {
    this.log('Running Playwright E2E tests...');

    // Run Playwright tests
    const e2eResult = this.runCommand('npm test');
    if (!e2eResult.success) {
      // Generate test report even if tests fail
      this.log('E2E tests failed, but generating report...', 'warn');
    }

    // Generate test report (continue even if it fails)
    this.log('Generating test report...');
    const reportResult = this.runCommand('npm run report', { stdio: 'pipe' });
    if (reportResult.success) {
      this.log('Test report generated: test-results/report/index.html');
    }

    if (!e2eResult.success) {
      throw new Error(`Playwright E2E test error: ${e2eResult.error}`);
    }

    this.log('Playwright E2E tests completed');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.log('Running cleanup...');

    // Stop Spanner emulator
    this.runCommand('make stop');

    this.log('Cleanup completed');
  }

  /**
   * Show test results summary
   */
  showSummary(success: boolean, error: string | null = null): void {
    const elapsedTime = this.getElapsedTime();

    this.log('='.repeat(70));
    this.log('🧪 E2E Test Results Summary');
    this.log('='.repeat(70));
    this.log(`Execution time: ${elapsedTime}`);

    if (success) {
      this.log('🎉 All tests completed successfully!');
      this.log('');
      this.log('📊 Generated files:');
      this.log(
        `  - Test report: ${path.join(TESTBED_PROJECT_PATH, 'test-results/report/index.html')}`
      );
      this.log(`  - Screenshots: ${path.join(TESTBED_PROJECT_PATH, 'test-results/')}`);
      this.log('');
      this.log('🔍 Detailed inspection:');
      this.log(`  cd ${path.relative(process.cwd(), TESTBED_PROJECT_PATH)}`);
      this.log('  make test-report                 # Show test report');
      this.log('  make test-e2e-ui                 # Test UI mode');
    } else {
      this.log('💥 Errors occurred during test execution', 'error');
      if (error) {
        this.log(`Error details: ${error}`, 'error');
      }
      this.log('');
      this.log('🔧 Troubleshooting:');
      this.log('  1. Ensure Docker Desktop is running');
      this.log('  2. Ensure wrench is installed');
      this.log('  3. Ensure ports 9010, 9020 are not in use');
      this.log('');
      this.log('🔍 Detailed inspection:');
      this.log(`  cd ${path.relative(process.cwd(), TESTBED_PROJECT_PATH)}`);
      this.log('  make help                        # Available commands');
      this.log('  make check-prerequisites         # Check prerequisites');
    }

    this.log('='.repeat(70));
  }

  /**
   * Main execution function
   */
  async run(): Promise<boolean> {
    let success = false;
    let error: string | null = null;

    try {
      // 1. Check prerequisites
      this.checkPrerequisites();

      // 2. Initialize testbed
      await this.initializeTestbed();

      // 3. Run scenario-based tests (includes emulator setup)
      await this.runScenarioTests();

      // 4. Run Playwright E2E tests
      await this.runPlaywrightTests();

      success = true;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      this.log(`E2E test execution error: ${error}`, 'error');
    } finally {
      // 7. Cleanup
      await this.cleanup();

      // 8. Show results summary
      this.showSummary(success, error);
    }

    return success;
  }
}

// Script execution
if (process.argv[1] === __filename) {
  const runner = new E2ETestRunner();
  runner
    .run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export default E2ETestRunner;
