# Codebase Structure

## Generator Source Code (`src/`)
- **`index.ts`**: Main CLI entry point, orchestrates project creation
- **`cli.ts`**: Command-line parsing, help/version handling  
- **`configuration.ts`**: Interactive/non-interactive database configuration
- **`validation.ts`**: Input validation with security checks
- **`file-operations.ts`**: Secure file/directory operations with path validation
- **`errors.ts`**: Custom error classes and error handling utilities
- **`security.ts`**: Path traversal protection and security utilities
- **`template-security.ts`**: Secure template processing and input validation
- **`constants.ts`**: Application constants, messages, validation patterns
- **`secure-temp.ts`**: Secure temporary file/directory creation

## Template Structure (`template/`)
- **`cmd/seed-injector/`**: Go CLI tool for database seeding
- **`internal/spanwright/`**: Go internal packages for database operations
- **`scenarios/`**: Example test scenarios with fixtures and Playwright tests
- **`tests/`**: Test infrastructure (global setup, database isolation, utilities)
- **`Makefile`**: Workflow automation with Docker orchestration
- **Configuration templates**: `go.mod.template`, `_package.json`, etc.

## Testing (`src/__tests__/`)
- **Unit tests**: Comprehensive coverage for all modules
- **Security tests**: Path traversal, input validation
- **CLI tests**: Command-line parsing and error handling
- **Integration tests**: File operations and template processing

## Scripts & Configuration
- **`scripts/`**: Build utilities, E2E test runner, Go version management
- **Configuration files**: ESLint, Prettier, TypeScript, Vitest configs
- **GitHub Actions**: CI/CD, automated Go version updates

## Key Design Patterns
- **Security-first**: All file operations go through security validation
- **Error handling**: Structured custom errors with context
- **Template processing**: Secure replacement with input validation
- **Modular architecture**: Clear separation of concerns