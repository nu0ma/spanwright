import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const fsPromises = fs.promises;

// Cleanup handlers registry
const cleanupHandlers = new Set<() => void | Promise<void>>();
let cleanupRegistered = false;

/**
 * Register cleanup handlers for process exit
 */
function registerCleanupHandlers(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const runCleanup = async () => {
    const handlers = Array.from(cleanupHandlers);
    cleanupHandlers.clear();
    
    for (const handler of handlers) {
      try {
        await handler();
      } catch (error) {
        // Suppress errors during cleanup to avoid interrupting other handlers
        console.error('Cleanup handler error:', error);
      }
    }
  };

  // Handle various exit scenarios
  process.on('exit', runCleanup);
  process.on('SIGINT', async () => {
    await runCleanup();
    process.exit(130); // Standard exit code for SIGINT
  });
  process.on('SIGTERM', async () => {
    await runCleanup();
    process.exit(143); // Standard exit code for SIGTERM
  });
}

/**
 * Create a secure temporary directory
 * @param prefix - Optional prefix for the directory name
 * @returns Path to the created temporary directory
 */
export async function createSecureTempDir(prefix: string = 'spanwright-'): Promise<string> {
  // Get the real path of the system temp directory
  const realTmpDir = await fsPromises.realpath(os.tmpdir());
  
  // Create secure temporary directory with random suffix
  // mkdtemp expects a path that ends with XXXXXX or will append random characters
  const tempDir = await fsPromises.mkdtemp(path.join(realTmpDir, prefix));
  
  // Register cleanup handler
  registerCleanupHandlers();
  const cleanup = async () => {
    try {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore errors during cleanup
    }
  };
  cleanupHandlers.add(cleanup);
  
  return tempDir;
}

/**
 * Execute a function with a temporary directory that is automatically cleaned up
 * @param fn - Async function that receives the temp directory path
 * @param prefix - Optional prefix for the directory name
 * @returns The result of the function
 */
export async function withTempDir<T>(
  fn: (tempDir: string) => Promise<T>,
  prefix: string = 'spanwright-'
): Promise<T> {
  const tempDir = await createSecureTempDir(prefix);
  
  try {
    return await fn(tempDir);
  } finally {
    // Clean up the directory
    try {
      await fsPromises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Log but don't throw - the operation succeeded even if cleanup failed
      console.error('Failed to clean up temp directory:', tempDir, error);
    }
    
    // Remove from cleanup handlers since we already cleaned up
    cleanupHandlers.forEach(handler => {
      if (handler.toString().includes(tempDir)) {
        cleanupHandlers.delete(handler);
      }
    });
  }
}

/**
 * Create a secure temporary file within a directory
 * @param dir - Directory to create the file in
 * @param prefix - Prefix for the filename
 * @returns Object with file descriptor and path
 */
export async function createSecureTempFile(
  dir: string,
  prefix: string = 'tmp-'
): Promise<{ fd: fs.promises.FileHandle; path: string }> {
  // Generate a unique filename with crypto-random suffix
  const randomBytes = await promisify(require('crypto').randomBytes)(16);
  const randomSuffix = randomBytes.toString('hex');
  const filename = `${prefix}${randomSuffix}`;
  const filePath = path.join(dir, filename);
  
  // Open file with exclusive creation flag (O_EXCL)
  const fd = await fsPromises.open(filePath, 'wx', 0o600);
  
  return { fd, path: filePath };
}

/**
 * Synchronous version of createSecureTempDir for compatibility
 * @param prefix - Optional prefix for the directory name
 * @returns Path to the created temporary directory
 */
export function createSecureTempDirSync(prefix: string = 'spanwright-'): string {
  // Get the real path of the system temp directory
  const realTmpDir = fs.realpathSync(os.tmpdir());
  
  // Create secure temporary directory with random suffix
  const tempDir = fs.mkdtempSync(path.join(realTmpDir, prefix));
  
  // Register cleanup handler
  registerCleanupHandlers();
  const cleanup = () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore errors during cleanup
    }
  };
  cleanupHandlers.add(cleanup);
  
  return tempDir;
}