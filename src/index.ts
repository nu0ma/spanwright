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
import { logger } from './logger';
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
      logger.error(MESSAGES.ERRORS.DIRECTORY_EXISTS(projectName));
      process.exit(1);
    }

    logger.info(MESSAGES.INFO.STARTING_SETUP);
    logger.log('');

    // Get configuration
    const isNonInteractive = isNonInteractiveMode(flags);
    const config = await getConfiguration(isNonInteractive);

    logger.log('');
    logger.info(MESSAGES.INFO.CREATING_DIRECTORY);
    ensureDirectoryExists(projectPath);

    // Copy template files
    logger.info(MESSAGES.INFO.COPYING_TEMPLATES);
    const templatePath = path.join(__dirname, '..', 'template');
    copyDirectory(templatePath, projectPath);

    // Process template files
    processTemplateFiles(projectPath, projectName);

    // Rename fixture directories to match database names
    const secondaryDbName = config.count === '2' ? config.secondaryDbName : undefined;
    renameFixtureDirectories(projectPath, config.primaryDbName, secondaryDbName);

    // Replace PROJECT_NAME in Go files
    logger.info(MESSAGES.INFO.CONFIGURING_GO);
    replaceProjectNameInGoFiles(projectPath, projectName);

    // Create environment configuration
    logger.info(MESSAGES.INFO.CREATING_ENV);
    const envContent = generateEnvironmentContent(config);

    const envPath = path.join(projectPath, FILE_PATTERNS.ENV);

    writeFileContent(envPath, envContent);

    // Remove unnecessary files for single DB configuration
    if (config.count === '1') {
      logger.info(MESSAGES.INFO.REMOVING_FILES);
      removeSecondaryDbFiles(projectPath);
    }

    // Show completion message
    logger.log('');
    logger.success(MESSAGES.INFO.COMPLETED);
  } catch (error) {
    handleError(error);
  }
}

// Start the application
createProject();
