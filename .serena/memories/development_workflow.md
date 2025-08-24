# Development Workflow

## Two-Phase Architecture

### Phase 1: CLI Generation (`src/`)
- Interactive CLI prompts for database configuration
- Non-interactive mode with environment variables
- Template file copying and customization
- Dynamic `.env` file generation based on DB count (1 or 2)
- Security validation of all inputs and file paths
- Secure temporary file handling during project creation

### Phase 2: Generated Project (`template/`)
- Complete project scaffold with Go tools
- Playwright test framework with shared database configuration
- Make workflows for automation
- Docker Spanner emulator integration
- Three example scenarios for customization

## Usage Modes

### Interactive Mode (Default)
```bash
npx spanwright my-project
# Interactive prompts guide through setup:
# - Database count (1 or 2)
# - Database names
# - Schema paths
```

### Non-Interactive Mode
```bash
# Environment variable configuration
export SPANWRIGHT_DB_COUNT=2
export SPANWRIGHT_PRIMARY_DB_NAME=primary-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema
export SPANWRIGHT_SECONDARY_DB_NAME=secondary-db
export SPANWRIGHT_SECONDARY_SCHEMA_PATH=./schema2
npx spanwright my-project --non-interactive
```

### CI/CD Integration
```bash
# GitHub Actions example
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=ci-test-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=/tmp/schema
export SPANWRIGHT_NON_INTERACTIVE=true
npx spanwright ci-test-project
```

## Generated Project Workflow

### Initial Setup
```bash
cd my-project
make init                    # Initialize and install dependencies
make start                   # Start Spanner emulator
make setup                   # Setup databases and schemas
```

### Testing Workflow
```bash
make test                    # Run all test scenarios
make test-scenario SCENARIO=example-01-basic-setup  # Run specific scenario
```

### Utilities
```bash
make stop                    # Stop Spanner emulator
make help                    # Show available commands
```

## Development Process

### For Contributors
1. **Setup**: `git clone` → `pnpm install`
2. **Development**: `pnpm run dev` (watch mode)
3. **Testing**: `pnpm run build && pnpm test` (unit + E2E)
4. **Quality**: `pnpm run lint && pnpm run format`

### For Template Development
1. Edit files in `template/` directory
2. Test changes: `pnpm run build && pnpm test`
3. Commit only after E2E tests pass

### Build System
- **TypeScript compilation**: tsdown for fast builds
- **Testing**: Vitest for unit tests + custom E2E runner
- **Quality checks**: ESLint + Prettier with strict rules
- **Package management**: pnpm with preinstall restrictions

## Testing Strategy
- **Unit Tests**: All generator modules with security focus
- **E2E Tests**: Full CLI → project generation → test execution
- **Security Tests**: Path traversal, input validation, template processing
- **Template Tests**: Go compilation, Playwright execution
- **Coverage Requirements**: 85% statements, 90% branches, 95% functions

## Troubleshooting Workflow

### Docker/Emulator Issues
```bash
make start              # Check emulator startup
make stop && make start # Reset emulator state
```

### Schema Migration Issues
```bash
wrench version          # Verify installation
ls -la schema/          # Check schema files
make setup              # Manual migration
```

### Go Build Issues
```bash
go version              # Check version (.tool-versions)
go mod tidy             # Clean dependencies
go build ./cmd/seed-injector  # Test compilation
```

### Environment Issues
- Node.js version: >= 22.15.1 for CLI, >= 16.0.0 for projects
- Docker daemon permissions
- Schema path accessibility

## Version Management
- **Go versions**: Managed via `.tool-versions` (mise/asdf compatible)
- **Node.js**: Specified in `package.json` engines
- **Dependencies**: Automated updates via GitHub Actions
- **Single source of truth**: `.tool-versions` for all environments