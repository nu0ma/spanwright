# Codebase Structure

## Generator Source Code (`src/`)
- **`index.ts`**: Main CLI entry point, orchestrates project creation
- **`commands/`**: Command handling and CLI interface
  - `spanwright.ts`: Main spanwright command implementation
  - `index.ts`: Command exports
- **`configuration.ts`**: Interactive/non-interactive database configuration
- **`validation.ts`**: Input validation with security checks
- **`file-operations.ts`**: Secure file/directory operations with path validation
- **`errors.ts`**: Custom error classes and error handling utilities
- **`security.ts`**: Path traversal protection and security utilities
- **`template-security.ts`**: Secure template processing and input validation
- **`constants.ts`**: Application constants, messages, validation patterns
- **`secure-temp.ts`**: Secure temporary file/directory creation
- **`logger.ts`**: Logging utilities

## Template Structure (`template/`)
### Generated Project Components
- **`cmd/seed-injector/`**: Go CLI tool for database seeding with pooled connections
- **`internal/spanwright/`**: Go internal packages for database operations
  - `config/`: Environment validation and database configuration
  - `db/`: Spanner client interfaces and pooled connection management
  - `retry/`: Resilient operation patterns
- **`scenarios/`**: Three example test scenarios with fixtures and Playwright tests
  - `example-01-basic-setup/`: Basic single-table tests
  - `scenario-02-intermediate/`: Multi-table relationships
  - `scenario-03-advanced/`: Complex business logic
- **`tests/`**: Test infrastructure
  - `global-setup.ts`: Simple emulator startup
  - `db-config.ts`: Database configuration utilities
  - `test-utils.ts`: Test helper functions
  - `global-teardown.ts`: Cleanup utilities
- **`Makefile`**: Workflow automation with Docker orchestration and spalidate integration
- **Configuration templates**: `go.mod.template`, `_package.json`, etc.

### Template Files
- **`_gitignore`**: Gitignore template for generated projects
- **`README.md`**: Generated project documentation
- **`playwright.config.ts`**: Playwright configuration
- **`tsconfig.json`**: TypeScript configuration for generated projects
- **`expected-*.yaml.template`**: Database validation templates

## Testing (`src/__tests__/`)
- **Unit tests**: Comprehensive coverage for all modules
  - `security.test.ts`: Security validation tests
  - `file-operations.test.ts`: File operation security tests
  - `configuration.test.ts`: Configuration logic tests
  - `validation.test.ts`: Input validation tests
  - `template-security.test.ts`: Template processing security
  - `constants.test.ts`: Constants validation
  - `errors.test.ts`: Error handling tests
  - `cli-security.test.ts`: CLI security tests
  - `secure-temp.test.ts`: Temporary file security
- **Mock utilities**: `__mocks__/test-utils.ts`

## Scripts & Configuration
- **`scripts/`**: Build utilities, E2E test runner, Go version management
- **`e2e/`**: End-to-end integration tests
- **Configuration files**: ESLint, Prettier, TypeScript, Vitest configs
- **GitHub Actions**: CI/CD, automated Go version updates
- **Package management**: pnpm with strict dependency management

## Key Design Patterns
- **Security-first approach**: All file operations go through security validation
- **Error handling**: Structured custom errors with context
- **Template processing**: Secure replacement with input validation
- **Modular architecture**: Clear separation of concerns
- **Performance optimization**: Pooled connections and batch operations

## Development Structure
- **CLI Generator**: TypeScript with CommonJS output
- **Template**: Complete project scaffold ready for customization
- **Testing**: Unit tests + E2E integration testing
- **Build System**: tsdown for fast compilation and bundling
- **Quality Assurance**: ESLint, Prettier, comprehensive test coverage