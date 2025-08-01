# Code Style and Conventions

## TypeScript Style
- **Function/Method Names**: Simple and clear (per CLAUDE.md)
- **No Comments**: Do not add comments to function and method names (per CLAUDE.md)
- **Type Annotations**: Explicit return types recommended but not enforced
- **Error Handling**: Custom error classes (SpanwrightError, ValidationError, FileSystemError, ConfigurationError, SecurityError)

## Code Organization
- **Strict Security**: Path traversal validation, input sanitization
- **Modular Architecture**: Separate modules for validation, file operations, CLI, configuration
- **Error Propagation**: Structured error handling with specific error types

## Naming Conventions
- **Files**: kebab-case (e.g., `file-operations.ts`, `template-security.ts`)
- **Functions**: camelCase with descriptive names
- **Interfaces**: PascalCase (e.g., `DatabaseConfig`, `ParsedArgs`)
- **Constants**: UPPER_SNAKE_CASE in constants.ts

## Security Practices
- **Input Validation**: All user inputs validated with regex patterns
- **Path Security**: Path traversal protection in all file operations
- **Template Security**: Secure template replacement with input validation
- **No Secrets**: Never commit secrets or expose them in logs

## Testing Conventions
- **Unit Tests**: Vitest with comprehensive mocking
- **E2E Tests**: Full CLI testing with real project generation
- **Coverage**: High thresholds (85-95% across metrics)
- **Security Tests**: Dedicated security validation tests