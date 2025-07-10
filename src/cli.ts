import * as fs from 'fs';
import * as path from 'path';
import { APP_NAME, APP_DESCRIPTION, GITHUB_URL, CLI_FLAGS, MESSAGES } from './constants';
import { safeExit } from './errors';
import { isFlag } from './validation';

// CLI parsing and display utilities

export interface ParsedArgs {
  projectName?: string;
  flags: string[];
}

export function parseCommandLineArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const flags = args.filter(isFlag);
  const projectName = args.find(arg => !isFlag(arg));

  return { projectName, flags };
}

export function checkForHelpAndVersion(flags: string[]): void {
  if (flags.some(flag => (CLI_FLAGS.VERSION as readonly string[]).includes(flag))) {
    showVersion();
  }

  if (flags.some(flag => (CLI_FLAGS.HELP as readonly string[]).includes(flag))) {
    showHelp();
  }
}

export function showVersion(): never {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(packageJson.version);
  } catch {
    console.error('Error reading version from package.json');
  }

  safeExit(0);
}

export function showHelp(): never {
  const helpText = `${APP_NAME} - ${APP_DESCRIPTION}

Usage: spanwright [options] <project-name>

Options:
  -v, --version    Show version number
  -h, --help       Show help information

Arguments:
  project-name     Name of the project to create

Examples:
  spanwright my-project              Create a new project interactively
  spanwright my-project --non-interactive   Create with default settings

Non-interactive mode environment variables:
  SPANWRIGHT_DB_COUNT              Number of databases (1 or 2, default: 1)
  SPANWRIGHT_PRIMARY_DB_NAME       Primary database name (default: primary-db)
  SPANWRIGHT_PRIMARY_SCHEMA_PATH   Primary database schema path (default: ./schema)
  SPANWRIGHT_SECONDARY_DB_NAME     Secondary database name (default: secondary-db)
  SPANWRIGHT_SECONDARY_SCHEMA_PATH Secondary database schema path (default: ./schema2)

For more information, visit: ${GITHUB_URL}
`;

  console.log(helpText);
  safeExit(0);
}

export function showUsageError(): never {
  console.error(MESSAGES.ERRORS.NO_PROJECT_NAME);
  console.log(MESSAGES.USAGE.BASIC);
  console.log(MESSAGES.USAGE.HELP_SUGGESTION);
  safeExit(1);
}

export function isNonInteractiveMode(flags: string[]): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.SPANWRIGHT_NON_INTERACTIVE === 'true' ||
    flags.includes(CLI_FLAGS.NON_INTERACTIVE)
  );
}
