#!/usr/bin/env node

import * as path from 'path';
import {
  parseCommandLineArgs,
  checkForHelpAndVersion,
  isNonInteractiveMode,
  showUsageError,
} from './cli';
import { getConfiguration, generateEnvironmentContent } from './configuration';
import { validateProjectName } from './validation';
import { handleError } from './errors';
import { MESSAGES, FILE_PATTERNS } from './constants';
import {
  ensureDirectoryExists,
  copyDirectory,
  processTemplateFiles,
  replaceProjectNameInGoFiles,
  removeSecondaryDbFiles,
  writeFileContent,
  renameFixtureDirectories,
} from './file-operations';

async function createProject(): Promise<void> {
  try {
    // Parse command line arguments
    const { projectName, flags } = parseCommandLineArgs();

    // Check for version and help flags first
    checkForHelpAndVersion(flags);

    // Validate project name
    if (!projectName) {
      showUsageError();
    }
    validateProjectName(projectName);

    // Check if directory already exists
    const projectPath = path.resolve(process.cwd(), projectName);
    const fs = await import('fs');
    if (fs.existsSync(projectPath)) {
      console.error(MESSAGES.ERRORS.DIRECTORY_EXISTS(projectName));
      process.exit(1);
    }

    console.log(MESSAGES.INFO.STARTING_SETUP);
    console.log('');

    // Get configuration
    const isNonInteractive = isNonInteractiveMode(flags);
    const config = await getConfiguration(isNonInteractive);

    console.log('');
    console.log(MESSAGES.INFO.CREATING_DIRECTORY);
    ensureDirectoryExists(projectPath);

    // Copy template files
    console.log(MESSAGES.INFO.COPYING_TEMPLATES);
    const templatePath = path.join(__dirname, '..', 'template');
    copyDirectory(templatePath, projectPath);

    // Process template files
    processTemplateFiles(projectPath, projectName);

    // Rename fixture directories to match database names
    const secondaryDbName = config.count === '2' ? config.secondaryDbName : undefined;
    renameFixtureDirectories(projectPath, config.primaryDbName, secondaryDbName);

    // Replace PROJECT_NAME in Go files
    console.log(MESSAGES.INFO.CONFIGURING_GO);
    replaceProjectNameInGoFiles(projectPath, projectName);

    // Create environment configuration
    console.log(MESSAGES.INFO.CREATING_ENV);
    const envContent = generateEnvironmentContent(config);

    const envPath = path.join(projectPath, FILE_PATTERNS.ENV);

    writeFileContent(envPath, envContent);

    // Remove unnecessary files for single DB configuration
    if (config.count === '1') {
      console.log(MESSAGES.INFO.REMOVING_FILES);
      removeSecondaryDbFiles(projectPath);
    }

    // Show completion message
    console.log('');
    console.log(MESSAGES.INFO.COMPLETED);
    console.log('');
    console.log('📋 Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  make init           # Initial setup');
    console.log('  make run-all-scenarios  # Run samples');
    console.log('');
    console.log('🔧 Create new test scenario:');
    console.log('  make new-scenario SCENARIO=scenario-01-my-test');
    console.log('');
    console.log('📚 Detailed documentation: See README.md');
  } catch (error) {
    handleError(error);
  }
}

// Start the application
createProject();
