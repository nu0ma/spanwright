#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

/**
 * Complete automated E2E test script
 * Tests actual CLI by creating a real Spanwright project and running E2E tests
 */

const PROJECT_ROOT = path.join(__dirname, '..');
const TEST_PROJECT_NAME = 'ci-test-project';
const TEST_PROJECT_PATH = path.join(PROJECT_ROOT, TEST_PROJECT_NAME);
const TEMP_SCHEMA_BASE = '/tmp/ci-schemas';

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
}

class E2ETestRunner {
  private startTime: number;

  constructor() {
    this.log('Starting real CLI E2E test execution...');
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
      cwd: TEST_PROJECT_PATH,
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

    // Check Docker
    this.checkDocker();

    // Check wrench (will be checked by Makefile, but check here as well)
    const wrenchResult = this.runCommand('which wrench', { stdio: 'pipe', cwd: PROJECT_ROOT });
    if (!wrenchResult.success) {
      throw new Error(
        'wrench not found.\nInstall with: go install github.com/cloudspannerecosystem/wrench@latest'
      );
    }

    // Check Node.js
    const nodeResult = this.runCommand('node --version', { stdio: 'pipe', cwd: PROJECT_ROOT });
    if (!nodeResult.success) {
      throw new Error('Node.js not found');
    }

    this.log('Prerequisites check completed');
  }

  /**
   * Setup CI schemas
   */
  async setupCISchemas(): Promise<void> {
    this.log('Setting up CI schemas...');

    // Run the schema setup script
    const schemaResult = this.runCommand('npx ts-node scripts/setup-ci-schemas.ts', { cwd: PROJECT_ROOT });
    if (!schemaResult.success) {
      throw new Error(`CI schema setup error: ${schemaResult.error}`);
    }

    this.log('CI schemas setup completed');
  }

  /**
   * Create project using actual CLI
   */
  async createProjectWithCLI(): Promise<void> {
    this.log('Creating project with actual CLI...');

    // Clean up existing test project
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
    }

    // Build CLI first
    this.log('Building CLI...');
    const buildResult = this.runCommand('npm run build', { cwd: PROJECT_ROOT });
    if (!buildResult.success) {
      throw new Error(`CLI build error: ${buildResult.error}`);
    }

    // Set environment variables for non-interactive mode
    const env = {
      ...process.env,
      SPANWRIGHT_DB_COUNT: '2',
      SPANWRIGHT_PRIMARY_DB_NAME: 'ci-primary-db',
      SPANWRIGHT_PRIMARY_SCHEMA_PATH: path.join(TEMP_SCHEMA_BASE, 'primary'),
      SPANWRIGHT_SECONDARY_DB_NAME: 'ci-secondary-db',
      SPANWRIGHT_SECONDARY_SCHEMA_PATH: path.join(TEMP_SCHEMA_BASE, 'secondary'),
      CI: 'true'
    };

    // Run actual CLI
    this.log('Running actual CLI...');
    const cliResult = this.runCommand(`node dist/index.js ${TEST_PROJECT_NAME}`, {
      cwd: PROJECT_ROOT,
      env
    });

    if (!cliResult.success) {
      throw new Error(`CLI execution error: ${cliResult.error}`);
    }

    // Verify project was created
    if (!fs.existsSync(TEST_PROJECT_PATH)) {
      throw new Error(`Project directory was not created: ${TEST_PROJECT_PATH}`);
    }

    this.log('Project created successfully with actual CLI');
  }

  /**
   * Initialize the generated project
   */
  async initializeProject(): Promise<void> {
    this.log('Initializing generated project...');

    // Run make init (.env file check and Playwright setup)
    const initResult = this.runCommand('make init');
    if (!initResult.success) {
      throw new Error(`Project initialization error: ${initResult.error}`);
    }

    this.log('Project initialization completed');
  }

  /**
   * Test make commands in generated project
   */
  async testMakeCommands(): Promise<void> {
    this.log('Testing make commands in generated project...');

    // Test help command
    const helpResult = this.runCommand('make help');
    if (!helpResult.success) {
      this.log('Make help command failed, but continuing...', 'warn');
    }

    // Test prerequisite check
    const prereqResult = this.runCommand('make check-tools');
    if (!prereqResult.success) {
      throw new Error(`Make check-tools failed: ${prereqResult.error}`);
    }

    this.log('Make commands test completed');
  }

  /**
   * Run full E2E scenarios
   */
  async runFullE2ETests(): Promise<void> {
    this.log('Running full E2E test pipeline...');

    try {
      // Run all scenarios - this includes emulator setup, schema creation, seeding, and Playwright tests
      const runAllResult = this.runCommand('make run-all-scenarios');
      if (!runAllResult.success) {
        throw new Error(`E2E pipeline failed: ${runAllResult.error}`);
      }

      this.log('Full E2E test pipeline completed successfully');
    } catch (error) {
      // Try to generate report even if tests fail
      this.log('E2E tests failed, attempting to generate report...', 'warn');
      const reportResult = this.runCommand('make test-report || true', { stdio: 'pipe' });
      if (reportResult.success) {
        this.log('Test report generated despite failures');
      }
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.log('Running cleanup...');

    // Stop Spanner emulator if project exists
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      this.runCommand('make stop');
    }

    // Clean up temporary schemas
    if (fs.existsSync(TEMP_SCHEMA_BASE)) {
      fs.rmSync(TEMP_SCHEMA_BASE, { recursive: true, force: true });
      this.log('Temporary schemas cleaned up');
    }

    // Clean up test project
    if (fs.existsSync(TEST_PROJECT_PATH)) {
      fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
      this.log('Test project cleaned up');
    }

    this.log('Cleanup completed');
  }

  /**
   * Show test results summary
   */
  showSummary(success: boolean, error: string | null = null): void {
    const elapsedTime = this.getElapsedTime();

    this.log('='.repeat(70));
    this.log('🧪 Real CLI E2E Test Results Summary');
    this.log('='.repeat(70));
    this.log(`Execution time: ${elapsedTime}`);

    if (success) {
      this.log('🎉 Real CLI E2E tests completed successfully!');
      this.log('');
      this.log('✅ Verified:');
      this.log('  - Actual CLI project generation');
      this.log('  - Template file integrity');
      this.log('  - Go module compilation');
      this.log('  - Spanner emulator integration');
      this.log('  - Database schema setup');
      this.log('  - Playwright browser tests');
      this.log('');
      this.log('📊 Generated files:');
      this.log(
        `  - Test project: ${TEST_PROJECT_PATH}`
      );
      this.log(`  - Test results: ${path.join(TEST_PROJECT_PATH, 'test-results/')}`
      );
    } else {
      this.log('💥 Real CLI E2E test failed', 'error');
      if (error) {
        this.log(`Error details: ${error}`, 'error');
      }
      this.log('');
      this.log('🔧 Troubleshooting:');
      this.log('  1. Ensure Docker Desktop is running');
      this.log('  2. Ensure wrench is installed');
      this.log('  3. Ensure ports 9010, 9020 are not in use');
      this.log('  4. Check schema files in /tmp/ci-schemas/');
      this.log('');
      this.log('🔍 Manual testing:');
      this.log('  npx ts-node scripts/setup-ci-schemas.ts');
      this.log('  # Set environment variables');
      this.log('  npx spanwright test-project');
      this.log('  cd test-project && make init && make run-all-scenarios');
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

      // 2. Setup CI schemas
      await this.setupCISchemas();

      // 3. Create project using actual CLI
      await this.createProjectWithCLI();

      // 4. Initialize the generated project
      await this.initializeProject();

      // 5. Test make commands
      await this.testMakeCommands();

      // 6. Run full E2E test pipeline
      await this.runFullE2ETests();

      success = true;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err);
      this.log(`Real CLI E2E test execution error: ${error}`, 'error');
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
