import * as path from 'path'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { validateProjectName } from '../validation'
import { getConfiguration, generateEnvironmentContent } from '../configuration'
import { handleError } from '../errors'
import { MESSAGES, FILE_PATTERNS } from '../constants'
import { logger } from '../logger'
import {
  ensureDirectoryExists,
  copyDirectory,
  processTemplateFiles,
  replaceProjectNameInGoFiles,
  writeFileContent,
  renameFixtureDirectories,
} from '../file-operations'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Utility function to check non-interactive mode
function isNonInteractiveMode(nonInteractiveFlag: boolean): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.SPANWRIGHT_NON_INTERACTIVE === 'true' ||
    nonInteractiveFlag
  )
}

export const spanwrightCommand = {
  name: 'spanwright',
  description: 'Generate Cloud Spanner E2E testing framework projects with Go database tools and Playwright browser automation',
  args: {
    projectName: {
      type: 'positional' as const,
      description: 'Name of the project to create',
      validate: async (value?: string) => {
        // Allow missing here; we'll enforce in run() to avoid subcommand parsing issues
        if (!value) return true

        // Use existing validation logic
        validateProjectName(value)

        // Check if directory already exists
        const projectPath = path.resolve(process.cwd(), value)
        try {
          await fs.access(projectPath)
          throw new Error(`Directory ${value} already exists`)
        } catch (error: any) {
          // Directory doesn't exist, which is what we want
          if (error.code !== 'ENOENT') {
            throw error
          }
        }
        return true
      }
    },
    nonInteractive: {
      type: 'boolean' as const,
      short: 'n',
      description: 'Run in non-interactive mode using environment variables',
      default: false
    }
  },
  examples: `# Create a new project interactively
$ spanwright my-project

# Create a project non-interactively with environment variables  
$ SPANWRIGHT_DB_COUNT=2 spanwright my-project --non-interactive

# Show help
$ spanwright --help`,
  
  run: async (ctx: any) => {
    try {
      const { nonInteractive } = ctx.values
      const positionals: string[] = Array.isArray(ctx.positionals) ? ctx.positionals : []
      const omitted: boolean = !!ctx.omitted
      // When a sub-command is present (our prefixed 'spanwright'), the first
      // positional is the command name and the project name is the next token.
      const projectName: string | undefined = omitted
        ? positionals[0]
        : positionals[1]

      if (!projectName) {
        throw new Error(MESSAGES.ERRORS.NO_PROJECT_NAME)
      }

      logger.info(MESSAGES.INFO.STARTING_SETUP)
      logger.log('')

      // Get configuration using existing logic
      const config = await getConfiguration(isNonInteractiveMode(nonInteractive))

      logger.log('')
      logger.info(MESSAGES.INFO.CREATING_DIRECTORY)
      
      const projectPath = path.resolve(process.cwd(), projectName)
      ensureDirectoryExists(projectPath)

      // Copy template files
      logger.info(MESSAGES.INFO.COPYING_TEMPLATES)
      const templatePath = path.join(__dirname, '..', 'template')
      copyDirectory(templatePath, projectPath)

      // Process template files
      processTemplateFiles(projectPath, projectName)

      // Rename fixture directories to match database names
      const secondaryDbName = config.count === '2' ? config.secondaryDbName : undefined
      renameFixtureDirectories(projectPath, config.primaryDbName, secondaryDbName)

      // Replace PROJECT_NAME in Go files
      logger.info(MESSAGES.INFO.CONFIGURING_GO)
      replaceProjectNameInGoFiles(projectPath, projectName)

      // Create environment configuration
      logger.info(MESSAGES.INFO.CREATING_ENV)
      const envContent = generateEnvironmentContent(config)

      const envPath = path.join(projectPath, FILE_PATTERNS.ENV)
      writeFileContent(envPath, envContent)


      // Show completion message
      logger.log('')
      logger.success(MESSAGES.INFO.COMPLETED)
      logger.log('')
      logger.log('📋 Next steps:')
      logger.log(`  cd ${projectName}`)
      logger.log('  make init           # Initial setup')
      logger.log('📚 Detailed documentation: See README.md')
    } catch (error) {
      handleError(error)
    }
  }
}