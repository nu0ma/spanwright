#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

/**
 * Simplified validation script
 * Validates Go syntax, TypeScript syntax, and basic configuration
 */

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

class SimpleValidator {
  private errors: string[] = [];

  log(message: string, success = true): void {
    const prefix = success ? '✅' : '❌';
    console.log(`${prefix} ${message}`);
  }

  error(message: string): void {
    this.errors.push(message);
    this.log(message, false);
  }

  // Validate Go files with simple syntax check
  validateGo(): boolean {
    this.log('Checking Go files...');
    
    try {
      // Check if go.mod template exists
      const goModTemplate = path.join(TEMPLATE_DIR, 'go.mod.template');
      if (!fs.existsSync(goModTemplate)) {
        this.error('go.mod.template not found');
        return false;
      }

      // Basic Go syntax check on main files
      const goFiles = [
        'cmd/seed-injector/main.go',
        'internal/spanwright/spanwright.go'
      ];

      for (const file of goFiles) {
        const filePath = path.join(TEMPLATE_DIR, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (!content.includes('package ')) {
            this.error(`${file}: Missing package declaration`);
            return false;
          }
        }
      }

      this.log('Go files valid');
      return true;
    } catch (error) {
      this.error(`Go validation failed: ${error}`);
      return false;
    }
  }

  // Validate TypeScript files
  validateTypeScript(): boolean {
    this.log('Checking TypeScript files...');
    
    try {
      const tsFiles = [
        'playwright.config.ts',
        'tests/global-setup.ts',
        'tests/database-isolation.ts'
      ];

      for (const file of tsFiles) {
        const filePath = path.join(TEMPLATE_DIR, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          // Basic syntax checks
          if (content.includes('import ') && !content.includes('from ')) {
            this.error(`${file}: Invalid import syntax`);
            return false;
          }
        }
      }

      this.log('TypeScript files valid');
      return true;
    } catch (error) {
      this.error(`TypeScript validation failed: ${error}`);
      return false;
    }
  }

  // Validate configuration files
  validateConfig(): boolean {
    this.log('Checking configuration files...');
    
    try {
      const configFiles = [
        '_package.json',
        'tsconfig.json'
      ];

      for (const file of configFiles) {
        const filePath = path.join(TEMPLATE_DIR, file);
        if (fs.existsSync(filePath)) {
          try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch {
            this.error(`${file}: Invalid JSON`);
            return false;
          }
        }
      }

      this.log('Configuration files valid');
      return true;
    } catch (error) {
      this.error(`Configuration validation failed: ${error}`);
      return false;
    }
  }

  // Validate project structure
  validateStructure(): boolean {
    this.log('Checking project structure...');
    
    const requiredDirs = [
      'cmd/seed-injector',
      'internal/spanwright',
      'scenarios',
      'tests'
    ];

    const requiredFiles = [
      'Makefile',
      '_package.json',
      'playwright.config.ts'
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.join(TEMPLATE_DIR, dir))) {
        this.error(`Missing required directory: ${dir}`);
        return false;
      }
    }

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(TEMPLATE_DIR, file))) {
        this.error(`Missing required file: ${file}`);
        return false;
      }
    }

    this.log('Project structure valid');
    return true;
  }

  // Run all validations
  async validate(): Promise<boolean> {
    console.log('🔍 Starting template validation...\n');

    const results = [
      this.validateStructure(),
      this.validateConfig(),
      this.validateGo(),
      this.validateTypeScript()
    ];

    const success = results.every(result => result);

    console.log('\n' + '='.repeat(50));
    if (success) {
      this.log('All validations passed!');
    } else {
      this.log(`Validation failed with ${this.errors.length} errors`, false);
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    return success;
  }
}

// Handle command line arguments
const validator = new SimpleValidator();

// Run validation
validator.validate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});