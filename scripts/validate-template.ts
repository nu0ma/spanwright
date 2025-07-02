#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Template validation script
 * Performs syntax checking for Go/TypeScript files in the template directory
 */

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');
const TEMP_DIR = path.join(__dirname, '..', '.temp-validation');

interface ValidationResult {
  success: boolean;
  error?: string;
}

class TemplateValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor() {
    // Initialize empty arrays for errors and warnings
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Validate Go files syntax
   */
  async validateGoFiles(): Promise<boolean> {
    this.log('Starting Go syntax validation...');
    
    try {
      // Create temporary go.mod file
      const tempGoMod = path.join(TEMP_DIR, 'go.mod');
      const goModContent = `module temp-validation

go 1.22

require cloud.google.com/go/spanner v1.55.0
require github.com/googleapis/gax-go/v2 v2.12.0
require google.golang.org/api v0.162.0
require google.golang.org/grpc v1.61.1
require gopkg.in/yaml.v2 v2.4.0
require github.com/joho/godotenv v1.5.1
`;
      
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }
      
      fs.writeFileSync(tempGoMod, goModContent);
      
      // Copy Go files from template directory to temporary directory
      this.copyGoFiles(TEMPLATE_DIR, TEMP_DIR);
      
      // Run go mod tidy
      execSync('go mod tidy', { 
        cwd: TEMP_DIR, 
        stdio: 'pipe'
      });
      
      // Run go vet
      execSync('go vet ./...', { 
        cwd: TEMP_DIR, 
        stdio: 'pipe'
      });
      
      // Run go build (dry-run)
      execSync('go build -o /dev/null ./...', { 
        cwd: TEMP_DIR, 
        stdio: 'pipe'
      });
      
      this.log('Go syntax validation: PASSED');
      return true;
      
    } catch (error: any) {
      this.errors.push(`Go syntax error: ${error.message}`);
      this.log(`Go syntax validation: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Validate TypeScript files syntax
   */
  async validateTypeScriptFiles(): Promise<boolean> {
    this.log('Starting TypeScript syntax validation...');
    
    try {
      // Find TypeScript files in template directory
      const tsFiles = this.findFiles(TEMPLATE_DIR, /\.ts$/);
      
      if (tsFiles.length === 0) {
        this.log('No TypeScript files found');
        return true;
      }
      
      // Create temporary tsconfig.json
      const tempTsConfig = path.join(TEMP_DIR, 'tsconfig.json');
      const tsConfigContent = {
        "compilerOptions": {
          "target": "ES2022",
          "lib": ["ES2022"],
          "module": "Node16",
          "moduleResolution": "Node16",
          "strict": true,
          "esModuleInterop": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "noEmit": true
        },
        "include": ["**/*.ts"],
        "exclude": ["node_modules", "dist"]
      };
      
      fs.writeFileSync(tempTsConfig, JSON.stringify(tsConfigContent, null, 2));
      
      // Copy TypeScript files to temporary directory
      for (const tsFile of tsFiles) {
        const relativePath = path.relative(TEMPLATE_DIR, tsFile);
        const destPath = path.join(TEMP_DIR, relativePath);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.copyFileSync(tsFile, destPath);
      }
      
      // Install required dependencies
      const packageJsonContent = {
        "name": "temp-validation",
        "version": "1.0.0",
        "dependencies": {
          "@playwright/test": "^1.40.0",
          "@types/node": "^20.0.0",
          "typescript": "^5.0.0"
        }
      };
      
      fs.writeFileSync(
        path.join(TEMP_DIR, 'package.json'), 
        JSON.stringify(packageJsonContent, null, 2)
      );
      
      // Run npm install
      execSync('npm install --silent', { 
        cwd: TEMP_DIR, 
        stdio: 'pipe'
      });
      
      // Run TypeScript syntax check
      execSync('npx tsc --noEmit', { 
        cwd: TEMP_DIR, 
        stdio: 'pipe'
      });
      
      this.log('TypeScript syntax validation: PASSED');
      return true;
      
    } catch (error: any) {
      this.errors.push(`TypeScript syntax error: ${error.message}`);
      this.log(`TypeScript syntax validation: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Validate YAML/JSON configuration files
   */
  async validateConfigFiles(): Promise<boolean> {
    this.log('Starting configuration file validation...');
    
    try {
      const yamlFiles = this.findFiles(TEMPLATE_DIR, /\.ya?ml$/);
      const jsonFiles = this.findFiles(TEMPLATE_DIR, /\.json$/);
      
      // Dynamic import of js-yaml
      let yaml: any;
      try {
        yaml = require('js-yaml');
      } catch {
        this.log('Installing js-yaml...', 'warn');
        execSync('npm install js-yaml --no-save', { stdio: 'pipe' });
        yaml = require('js-yaml');
      }
      
      // Validate YAML files
      for (const yamlFile of yamlFiles) {
        try {
          const content = fs.readFileSync(yamlFile, 'utf8');
          yaml.load(content);
        } catch (error: any) {
          this.errors.push(`YAML syntax error in ${yamlFile}: ${error.message}`);
        }
      }
      
      // Validate JSON files
      for (const jsonFile of jsonFiles) {
        try {
          const content = fs.readFileSync(jsonFile, 'utf8');
          JSON.parse(content);
        } catch (error: any) {
          this.errors.push(`JSON syntax error in ${jsonFile}: ${error.message}`);
        }
      }
      
      if (this.errors.length === 0) {
        this.log('Configuration file validation: PASSED');
        return true;
      } else {
        this.log(`Configuration file validation: ${this.errors.length} errors found`, 'error');
        return false;
      }
      
    } catch (error: any) {
      this.errors.push(`Configuration file validation error: ${error.message}`);
      this.log(`Configuration file validation: FAILED - ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Recursively copy Go files
   */
  private copyGoFiles(src: string, dest: string): void {
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }
        this.copyGoFiles(srcPath, destPath);
      } else if (item.endsWith('.go')) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Recursively find files matching pattern
   */
  private findFiles(dir: string, pattern: RegExp): string[] {
    const files: string[] = [];
    
    const search = (currentDir: string) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          search(fullPath);
        } else if (pattern.test(item)) {
          files.push(fullPath);
        }
      }
    };
    
    search(dir);
    return files;
  }

  /**
   * Clean up temporary directory
   */
  private cleanup(): void {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }

  /**
   * Main execution function
   */
  async run(): Promise<boolean> {
    this.log('Starting template validation...');
    
    try {
      let allPassed = true;
      
      // Validate Go files
      if (!await this.validateGoFiles()) {
        allPassed = false;
      }
      
      // Validate TypeScript files
      if (!await this.validateTypeScriptFiles()) {
        allPassed = false;
      }
      
      // Validate configuration files
      if (!await this.validateConfigFiles()) {
        allPassed = false;
      }
      
      // Show results
      this.log('='.repeat(50));
      if (allPassed) {
        this.log('🎉 All validations passed successfully!');
      } else {
        this.log('💥 Validation errors occurred:', 'error');
        this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
      }
      
      if (this.warnings.length > 0) {
        this.log('⚠️ Warnings:', 'warn');
        this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warn'));
      }
      
      return allPassed;
      
    } finally {
      this.cleanup();
    }
  }
}

// Script execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const goOnly = args.includes('--go-only');
  const tsOnly = args.includes('--ts-only');
  const configOnly = args.includes('--config-only');
  
  const validator = new TemplateValidator();
  
  // Handle partial execution
  if (goOnly) {
    validator.validateGoFiles().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
  } else if (tsOnly) {
    validator.validateTypeScriptFiles().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
  } else if (configOnly) {
    validator.validateConfigFiles().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
  } else {
    // Run all validations
    validator.run().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
  }
}

export default TemplateValidator;