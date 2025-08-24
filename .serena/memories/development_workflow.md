# Development Workflow

## Development Process
1. **Edit templates** in `template/` directory
2. **Build and test** with `npm run build && npm test`
3. **Commit changes** after tests pass

## Two-Phase Architecture
### Phase 1: CLI Generation (`src/`)
- Interactive CLI prompts for database configuration
- Template file copying and customization  
- Dynamic `.env` file generation based on DB count (1 or 2)
- Security validation of all inputs and file paths

### Phase 2: Generated Project (`template/`)
- Complete project scaffold with Go tools
- Playwright test framework
- Make workflows for automation
- Docker Spanner emulator integration

## Key Workflows

### Interactive Mode
```bash
npx spanwright my-project
# Prompts for database count, names, schema paths
# Creates project with user configuration
```

### Non-Interactive Mode  
```bash
# Set environment variables
export SPANWRIGHT_DB_COUNT=2
export SPANWRIGHT_PRIMARY_DB_NAME=primary-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema
export SPANWRIGHT_SECONDARY_DB_NAME=secondary-db  
export SPANWRIGHT_SECONDARY_SCHEMA_PATH=./schema2

npx spanwright my-project
```

### Generated Project Usage
```bash
cd my-project
make init                    # Initial setup
make test     # Run all test scenarios
```

## Testing Strategy
- **Unit Tests**: All generator modules
- **E2E Tests**: Full CLI → project generation → test execution
- **Security Tests**: Path traversal, input validation
- **Template Tests**: Go compilation, Playwright execution

## Version Management
- **Go versions**: Managed via `.tool-versions` and `.mise.toml`
- **Node.js**: Specified in `package.json` engines
- **Automated updates**: GitHub Actions for Go version updates