#!/usr/bin/env node

import { cli } from 'gunshi'
import { spanwrightCommand } from './commands/spanwright'
import { handleError } from './errors'

// Get package version
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))

// Start the Gunshi CLI application with a root (default) command.
// This allows usage like:
//  - `npx spanwright my-project`
//  - `node dist/index.js my-project`
// Gunshi requires a subcommand token; prefix with our command name
const gunshiArgs = ['spanwright', ...process.argv.slice(2)]
cli(gunshiArgs, spanwrightCommand, {
  name: 'spanwright',
  version: packageJson.version,
  description: packageJson.description
}).catch(handleError)
