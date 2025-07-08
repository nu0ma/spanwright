import * as fs from 'fs';
import * as path from 'path';
import { FileSystemError } from './errors';
import { FILE_PATTERNS, TEMPLATE_VARS } from './constants';

// File and directory operation utilities

export function ensureDirectoryExists(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    throw new FileSystemError(`Failed to create directory: ${dirPath}`, dirPath);
  }
}

export function copyDirectory(src: string, dest: string): void {
  try {
    ensureDirectoryExists(dest);
    
    const files = fs.readdirSync(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch {
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
    if (safeFileExists(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    throw new FileSystemError(`Failed to delete file: ${filePath}`, filePath);
  }
}

export function safeFileRename(oldPath: string, newPath: string): void {
  try {
    if (safeFileExists(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  } catch {
    throw new FileSystemError(`Failed to rename file from ${oldPath} to ${newPath}`, oldPath);
  }
}

export function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new FileSystemError(`Failed to read file: ${filePath}`, filePath);
  }
}

export function writeFileContent(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch {
    throw new FileSystemError(`Failed to write file: ${filePath}`, filePath);
  }
}

// Template processing utilities

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceInFile(filePath: string, replacements: Record<string, string>): void {
  let content = readFileContent(filePath);
  
  for (const [search, replace] of Object.entries(replacements)) {
    const escapedSearch = escapeRegExp(search);
    content = content.replace(new RegExp(escapedSearch, 'g'), replace);
  }
  
  writeFileContent(filePath, content);
}

export function processTemplateFiles(projectPath: string, projectName: string): void {
  // Rename template files
  const fileRenamings = [
    {
      from: path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.PACKAGE_JSON)
    },
    {
      from: path.join(projectPath, FILE_PATTERNS.GITIGNORE_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.GITIGNORE)
    },
    {
      from: path.join(projectPath, FILE_PATTERNS.GO_MOD_TEMPLATE),
      to: path.join(projectPath, FILE_PATTERNS.GO_MOD)
    }
  ];
  
  for (const { from, to } of fileRenamings) {
    safeFileRename(from, to);
  }
  
  // Process go.mod template
  const goModPath = path.join(projectPath, FILE_PATTERNS.GO_MOD);
  if (safeFileExists(goModPath)) {
    replaceInFile(goModPath, {
      [TEMPLATE_VARS.PROJECT_NAME]: projectName
    });
  }
  
  // Copy spalidate validation templates
  const validationTemplateFiles = [
    'expected-primary.yaml.template',
    'expected-secondary.yaml.template'
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
  function processDirectory(dir: string): void {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          processDirectory(fullPath);
        } else if (item.endsWith(FILE_PATTERNS.GO_EXTENSION)) {
          replaceInFile(fullPath, {
            [TEMPLATE_VARS.PROJECT_NAME]: projectName
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
  const exampleDir = path.join(projectPath, 'scenarios', 'example-01-basic-setup');
  
  const filesToRemove = [
    path.join(exampleDir, 'expected-secondary.yaml'),
    path.join(exampleDir, 'seed-data', 'secondary-seed.json'),
    path.join(projectPath, 'expected-secondary.yaml.template')
  ];
  
  for (const file of filesToRemove) {
    safeFileDelete(file);
  }
}
