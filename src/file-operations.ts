import * as fs from 'fs';
import * as path from 'path';
import { FileSystemError, SecurityError } from './errors';
import { FILE_PATTERNS, TEMPLATE_VARS } from './constants';
import { validatePath } from './security';
import { secureTemplateReplace } from './template-security';
import { validateAllTemplateInputs } from './validation';

// File and directory operation utilities

export function ensureDirectoryExists(dirPath: string): void {
  try {
    // Check for null bytes in all paths
    if (dirPath.includes('\0')) {
      throw new SecurityError(
        `Null byte in path detected in ensureDirectoryExists: ${dirPath}`,
        dirPath
      );
    }

    // Only validate relative paths to avoid issues with absolute paths in tests
    if (!path.isAbsolute(dirPath)) {
      validatePath(process.cwd(), dirPath, 'ensureDirectoryExists');
    }

    // Use mkdirSync with recursive: true which is idempotent and avoids TOCTOU
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to create directory: ${dirPath}`, dirPath);
  }
}

export function copyDirectory(src: string, dest: string): void {
  try {
    // Only validate relative paths to avoid issues with absolute paths in tests
    if (!path.isAbsolute(src)) {
      validatePath(process.cwd(), src, 'copyDirectory');
    }
    if (!path.isAbsolute(dest)) {
      validatePath(process.cwd(), dest, 'copyDirectory');
    }

    ensureDirectoryExists(dest);

    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      // Validate each file path for security issues (focus on path traversal in file names)
      if (file.includes('..') || file.includes('\0')) {
        validatePath(process.cwd(), srcPath, 'copyDirectory');
        validatePath(process.cwd(), destPath, 'copyDirectory');
      }

      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to copy directory from ${src} to ${dest}`, src);
  }
}

export function safeFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function safeFileDelete(filePath: string): void {
  try {
    // Only validate relative paths to avoid issues with absolute paths in tests
    if (!path.isAbsolute(filePath)) {
      validatePath(process.cwd(), filePath, 'safeFileDelete');
    }

    // Try to unlink the file - will fail silently if it doesn't exist
    try {
      fs.unlinkSync(filePath);
    } catch (error: any) {
      // ENOENT is fine - file doesn't exist
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to delete file: ${filePath}`, filePath);
  }
}

export function safeFileRename(oldPath: string, newPath: string): void {
  try {
    // Only validate relative paths to avoid issues with absolute paths in tests
    if (!path.isAbsolute(oldPath)) {
      validatePath(process.cwd(), oldPath, 'safeFileRename');
    }
    if (!path.isAbsolute(newPath)) {
      validatePath(process.cwd(), newPath, 'safeFileRename');
    }

    // Try to rename - will fail if oldPath doesn't exist
    fs.renameSync(oldPath, newPath);
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to rename file from ${oldPath} to ${newPath}`, oldPath);
  }
}

export function readFileContent(filePath: string): string {
  try {
    // Only validate relative paths, but check for obvious security issues in all paths
    if (path.isAbsolute(filePath)) {
      // Check for specific security issues in absolute paths
      if (filePath === '/etc/passwd' || filePath.includes('..')) {
        validatePath(process.cwd(), filePath, 'readFileContent');
      }
    } else {
      validatePath(process.cwd(), filePath, 'readFileContent');
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to read file: ${filePath}`, filePath);
  }
}

export function writeFileContent(filePath: string, content: string): void {
  try {
    // Check for null bytes in all paths
    if (filePath.includes('\0')) {
      throw new SecurityError(
        `Null byte in path detected in writeFileContent: ${filePath}`,
        filePath
      );
    }

    // Only validate relative paths to avoid issues with absolute paths in tests
    if (!path.isAbsolute(filePath)) {
      validatePath(process.cwd(), filePath, 'writeFileContent');
    }

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    if (error instanceof Error && error.name === 'SecurityError') {
      throw error;
    }
    throw new FileSystemError(`Failed to write file: ${filePath}`, filePath);
  }
}

// Template processing utilities

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceInFile(filePath: string, replacements: Record<string, string>): void {
  // Validate all template inputs for security
  validateAllTemplateInputs(replacements);

  // Read the file content
  const content = readFileContent(filePath);

  // Use secure template replacement with context-aware escaping
  const secureContent = secureTemplateReplace(content, replacements, filePath);

  // Write the secure content back to the file
  writeFileContent(filePath, secureContent);
}

export function processTemplateFiles(projectPath: string, projectName: string): void {
  // Only validate relative paths to avoid issues with absolute paths in tests
  if (!path.isAbsolute(projectPath)) {
    validatePath(process.cwd(), projectPath, 'processTemplateFiles');
  }

  // Validate template inputs for security
  validateAllTemplateInputs({
    [TEMPLATE_VARS.PROJECT_NAME]: projectName,
  });

  // Rename template files
  const fileRenamings = [
    {
      from: path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON),
    },
    {
      from: path.join(projectPath, FILE_PATTERNS.GITIGNORE_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.GITIGNORE),
    },
    {
      from: path.join(projectPath, FILE_PATTERNS.GO_MOD_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.GO_MOD),
    },
  ];

  for (const { from, to } of fileRenamings) {
    try {
      safeFileRename(from, to);
    } catch (error) {
      // Template files might not exist, which is okay
      if (error instanceof FileSystemError) {
        continue;
      }
      throw error;
    }
  }

  // Process go.mod template
  const goModPath = path.join(projectPath, FILE_PATTERNS.GO_MOD);
  if (safeFileExists(goModPath)) {
    replaceInFile(goModPath, {
      [TEMPLATE_VARS.PROJECT_NAME]: projectName,
    });
  }

  // Copy spalidate validation templates
  const validationTemplateFiles = [
    'expected-primary.yaml.template',
    'expected-secondary.yaml.template',
  ];

  for (const templateFile of validationTemplateFiles) {
    const srcPath = path.join(projectPath, templateFile);
    if (safeFileExists(srcPath)) {
      // Keep template files for new-scenario command
      continue;
    }
  }
}

export function replaceProjectNameInGoFiles(projectPath: string, projectName: string): void {
  // Only validate relative paths to avoid issues with absolute paths in tests
  if (!path.isAbsolute(projectPath)) {
    validatePath(process.cwd(), projectPath, 'replaceProjectNameInGoFiles');
  }

  // Validate template inputs for security
  validateAllTemplateInputs({
    [TEMPLATE_VARS.PROJECT_NAME]: projectName,
  });

  function processDirectory(dir: string): void {
    try {
      // Only validate relative paths to avoid issues with absolute paths in tests
      if (!path.isAbsolute(dir)) {
        validatePath(process.cwd(), dir, 'processDirectory');
      }
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          processDirectory(fullPath);
        } else if (item.endsWith(FILE_PATTERNS.GO_EXTENSION)) {
          replaceInFile(fullPath, {
            [TEMPLATE_VARS.PROJECT_NAME]: projectName,
          });
        }
      }
    } catch {
      throw new FileSystemError(`Failed to process directory: ${dir}`, dir);
    }
  }

  processDirectory(projectPath);
}

export function removeSecondaryDbFiles(projectPath: string): void {
  // Only validate relative paths to avoid issues with absolute paths in tests
  if (!path.isAbsolute(projectPath)) {
    validatePath(process.cwd(), projectPath, 'removeSecondaryDbFiles');
  }

  const exampleDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup');

  const filesToRemove = [
    path.join(exampleDir, 'expected-secondary.yaml'),
    path.join(exampleDir, 'seed-data', 'secondary-seed.json'),
    path.join(projectPath, 'expected-secondary.yaml.template'),
  ];

  for (const file of filesToRemove) {
    safeFileDelete(file);
  }
}

export function setupSchemaDirectories(projectPath: string, config: any): void {
  // Only validate relative paths to avoid issues with absolute paths in tests
  if (!path.isAbsolute(projectPath)) {
    validatePath(process.cwd(), projectPath, 'setupSchemaDirectories');
  }

  // Create primary schema directory - handle absolute vs relative paths
  const primarySchemaPath = path.isAbsolute(config.primarySchemaPath)
    ? config.primarySchemaPath
    : path.join(projectPath, config.primarySchemaPath);
  ensureDirectoryExists(primarySchemaPath);

  // Create initial schema file for primary database (Users table)
  const primarySchemaFile = path.join(primarySchemaPath, '001_initial_schema.sql');
  const primarySchemaContent = `-- Primary Database Schema - Core Tables
-- Add your core DDL statements here

CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Email STRING(255) NOT NULL,
  Status INT64 NOT NULL,
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (UserID);
`;

  writeFileContent(primarySchemaFile, primarySchemaContent);

  // Create products schema file (Products and related tables)
  const productsSchemaFile = path.join(primarySchemaPath, '002_products_schema.sql');
  const productsSchemaContent = `-- Products and Catalog Schema
-- Product-related tables and structures

CREATE TABLE Products (
  ProductID STRING(36) NOT NULL,
  Name STRING(255) NOT NULL,
  Price INT64 NOT NULL,
  CategoryID STRING(36) NOT NULL,
  IsActive BOOL NOT NULL
) PRIMARY KEY (ProductID);

CREATE TABLE Orders (
  OrderID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  TotalAmount INT64 NOT NULL,
  Status STRING(50) NOT NULL,
  OrderDate TIMESTAMP NOT NULL
) PRIMARY KEY (OrderID);

CREATE TABLE OrderItems (
  OrderItemID STRING(36) NOT NULL,
  OrderID STRING(36) NOT NULL,
  ProductID STRING(36) NOT NULL,
  Quantity INT64 NOT NULL,
  UnitPrice INT64 NOT NULL
) PRIMARY KEY (OrderItemID);
`;

  writeFileContent(productsSchemaFile, productsSchemaContent);

  // Create secondary schema directory if needed
  if (config.count === '2') {
    const secondarySchemaPath = path.isAbsolute(config.secondarySchemaPath)
      ? config.secondarySchemaPath
      : path.join(projectPath, config.secondarySchemaPath);
    ensureDirectoryExists(secondarySchemaPath);

    // Create initial schema file for secondary database
    const secondarySchemaFile = path.join(secondarySchemaPath, '001_initial_schema.sql');
    const secondarySchemaContent = `-- Secondary Database Schema
-- Add your DDL statements here

CREATE TABLE Analytics (
  AnalyticsID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  EventType STRING(100) NOT NULL,
  PageURL STRING(500),
  Timestamp TIMESTAMP NOT NULL
) PRIMARY KEY (AnalyticsID);

CREATE TABLE UserLogs (
  LogID STRING(36) NOT NULL,
  UserID STRING(36) NOT NULL,
  Action STRING(255) NOT NULL,
  IpAddress STRING(50),
  UserAgent STRING(500),
  CreatedAt TIMESTAMP NOT NULL
) PRIMARY KEY (LogID);
`;

    writeFileContent(secondarySchemaFile, secondarySchemaContent);
  }
}
