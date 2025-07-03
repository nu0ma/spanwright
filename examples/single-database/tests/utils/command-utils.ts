import { execFileSync, ExecFileSyncOptions } from 'child_process';
import path from 'path';

/**
 * Safely execute a command using execFileSync to prevent command injection
 * @param command The command to execute (e.g., 'go', 'make', 'npm')
 * @param args Array of arguments to pass to the command
 * @param options Additional options for execFileSync
 * @returns The command output as a string
 */
export function safeExecSync(
  command: string,
  args: string[] = [],
  options: ExecFileSyncOptions = {}
): string {
  const defaultOptions: ExecFileSyncOptions = {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  };

  try {
    const result = execFileSync(command, args, defaultOptions);
    return result ? result.toString() : '';
  } catch (error: any) {
    // Re-throw with more context
    let errorMessage = 'Unknown error';
    if (error.stderr) {
      errorMessage = error.stderr.toString ? error.stderr.toString() : String(error.stderr);
    } else if (error.message) {
      errorMessage = error.message;
    }
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${errorMessage}`);
  }
}

/**
 * Validate that a path is within the project root
 * @param inputPath The path to validate
 * @param projectRoot The project root directory
 * @returns The resolved absolute path
 * @throws Error if the path is outside the project root
 */
export function validatePath(inputPath: string, projectRoot: string): string {
  const resolvedPath = path.resolve(projectRoot, inputPath);
  const normalizedRoot = path.normalize(projectRoot);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error(`Path "${inputPath}" is outside project root`);
  }

  return resolvedPath;
}

/**
 * Validate database ID format
 * @param databaseId The database ID to validate
 * @throws Error if the database ID contains invalid characters
 */
export function validateDatabaseId(databaseId: string): void {
  // Allow only alphanumeric characters, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  
  if (!validPattern.test(databaseId)) {
    throw new Error(`Invalid database ID: "${databaseId}". Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }
}

/**
 * Validate scenario name format
 * @param scenario The scenario name to validate
 * @throws Error if the scenario name contains invalid characters
 */
export function validateScenarioName(scenario: string): void {
  // Allow only alphanumeric characters, hyphens, underscores, and dots
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  
  if (!validPattern.test(scenario)) {
    throw new Error(`Invalid scenario name: "${scenario}". Only alphanumeric characters, hyphens, underscores, and dots are allowed.`);
  }
}

/**
 * Execute a Go command safely
 * @param goFile The Go file to run
 * @param args Arguments to pass to the Go program
 * @param options Additional options for execFileSync
 * @returns The command output as a string
 */
export function safeGoRun(
  goFile: string,
  args: string[] = [],
  options: ExecFileSyncOptions = {}
): string {
  return safeExecSync('go', ['run', goFile, ...args], options);
}

/**
 * Execute a Make command safely
 * @param target The make target to run
 * @param args Additional arguments for make
 * @param options Additional options for execFileSync
 * @returns The command output as a string
 */
export function safeMakeRun(
  target: string,
  args: string[] = [],
  options: ExecFileSyncOptions = {}
): string {
  return safeExecSync('/usr/bin/make', [target, ...args], options);
}