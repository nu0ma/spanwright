# Contributing to Spanwright

Thank you for your interest in contributing to Spanwright! This comprehensive guide will help you get started with contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Code Style Guidelines](#code-style-guidelines)
- [Template Development](#template-development)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have the following tools installed:

- **Node.js** >= 22.0.0
- **pnpm** >= 9.0.0
- **Docker** (for Spanner emulator)
- **Go** >= 1.24.5 (for testing generated projects)
- **wrench** (Spanner migration tool): `go install github.com/cloudspannerecosystem/wrench@latest`
- **spalidate** (Database validation): Install from [github.com/nu0ma/spalidate](https://github.com/nu0ma/spalidate)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/spanwright.git
   cd spanwright
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nu0ma/spanwright.git
   ```

### Initial Setup

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm run build

# Verify setup
pnpm test
```

## Development Setup

### Development Commands

```bash
# Build TypeScript CLI
pnpm run build

# Watch mode for development
pnpm run dev

# Clean build artifacts
pnpm run clean

# Run comprehensive E2E tests
pnpm test

# Run unit tests only
pnpm run test:unit

# Lint code
pnpm run lint

# Format code
pnpm run format
```

### Environment Configuration

Create a `.env.local` file for development settings:

```bash
# Development overrides
DEBUG=spanwright:*
LOG_LEVEL=debug
TEMPLATE_VALIDATION_STRICT=true
```

## Project Architecture

### Core Components

#### CLI Generator (`src/`)
- **`index.ts`** - Main CLI entry point and orchestration
- **`cli.ts`** - Command-line parsing and help system
- **`configuration.ts`** - Interactive/non-interactive project configuration
- **`validation.ts`** - Input validation with security checks
- **`file-operations.ts`** - Secure file and directory operations
- **`template-security.ts`** - Template processing security

#### Template System (`template/`)
- **Complete project scaffold** that gets copied and customized
- **Go database tools** for seeding and validation
- **Playwright test infrastructure** with database integration
- **Makefile workflows** for automation

#### Scripts (`scripts/`)
- **Build utilities** and development tools
- **Template validation** and testing scripts
- **Version management** for Go toolchain

### Design Principles

1. **Security First**: All file operations validate paths and inputs
2. **Template Driven**: Generator creates projects from customizable templates  
3. **Tool Integration**: Seamless integration with external tools (wrench, spalidate)
4. **Multi-Database**: Support for 1 or 2 Spanner databases per project

## Development Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Keep up to date with upstream
git fetch upstream
git rebase upstream/main
```

### Typical Development Cycle

1. **Understand the Problem**
   - Read issue description thoroughly
   - Ask questions if requirements are unclear
   - Check for related issues or PRs

2. **Plan Your Approach**
   - Consider impact on existing functionality
   - Plan backwards-compatible changes
   - Think about edge cases

3. **Implement Changes**
   - Write code following style guidelines
   - Add comprehensive tests
   - Update documentation

4. **Test Thoroughly**
   - Run unit tests: `pnpm run test:unit`
   - Run E2E tests: `pnpm test`
   - Test on different operating systems if possible

5. **Submit for Review**
   - Create descriptive pull request
   - Respond to feedback promptly

## Testing Guidelines

### Test Categories

#### Unit Tests (`src/__tests__/`)
- Test individual functions and modules
- Mock external dependencies
- Focus on edge cases and error conditions

```typescript
// Example unit test
describe('validateDatabaseName', () => {
  it('should accept valid database names', () => {
    expect(validateDatabaseName('valid-db-name')).toBe(true);
  });
  
  it('should reject names with invalid characters', () => {
    expect(() => validateDatabaseName('invalid@name')).toThrow();
  });
});
```

#### Integration Tests
- Test CLI command execution
- Verify file generation and templating
- Validate generated project structure

#### E2E Tests (`pnpm test`)
- Create complete projects using the CLI
- Run generated project workflows
- Verify database operations work correctly

### Test Requirements

**For New Features:**
- Unit tests for all new functions
- Integration tests for CLI interactions
- E2E tests for complete workflows
- Edge case coverage (invalid inputs, error conditions)

**For Bug Fixes:**
- Regression test that reproduces the bug
- Verification that fix resolves the issue
- No impact on existing functionality

### Running Tests

```bash
# Quick unit tests
pnpm run test:unit

# Comprehensive E2E testing
pnpm test

# Test specific files
pnpm test -- --grep "configuration"

# Test with coverage
pnpm run test:coverage
```

## Code Style Guidelines

### TypeScript Style

```typescript
// Use meaningful names
interface DatabaseConfiguration {
  primaryDbName: string;
  secondaryDbName?: string;
  schemaPath: string;
}

// Document complex functions
/**
 * Validates database configuration and returns normalized config.
 * @param config Raw configuration input
 * @returns Validated configuration object
 * @throws ConfigurationError if validation fails
 */
function validateConfiguration(config: unknown): DatabaseConfiguration {
  // Implementation
}

// Use proper error handling
try {
  const result = await dangerousOperation();
  return result;
} catch (error) {
  throw new SpanwrightError('Operation failed', { cause: error });
}
```

### Go Style (Template Files)

```go
// Follow standard Go conventions
package main

import (
    "context"
    "fmt"
    
    "cloud.google.com/go/spanner"
)

// Document exported functions
// NewSpannerClient creates a new Spanner client configured for the emulator.
func NewSpannerClient(ctx context.Context, database string) (*spanner.Client, error) {
    // Implementation
}
```

### File Organization

```
src/
├── index.ts           # CLI entry point
├── configuration.ts   # Core configuration logic
├── validation.ts      # Input validation
├── file-operations.ts # File system operations
├── errors.ts         # Custom error classes
└── __tests__/        # Unit tests
    ├── configuration.test.ts
    └── validation.test.ts
```

## Template Development

### Template Structure

Templates use Go's `text/template` syntax with custom delimiters:

```typescript
// Template variables
interface TemplateVars {
  ProjectName: string;
  DatabaseConfig: {
    primaryDbName: string;
    secondaryDbName?: string;
    primarySchemaPath: string;
    secondarySchemaPath?: string;
  };
  HasSecondaryDB: boolean;
}
```

### Template Guidelines

1. **Use Conditional Logic**:
   ```go
   {{if .HasSecondaryDB}}
   // Secondary database code
   {{end}}
   ```

2. **Validate All Outputs**:
   - Go files must compile
   - TypeScript files must pass type checking
   - YAML/JSON files must be syntactically valid

3. **No Hardcoded Values**:
   - Use template variables for all configurable values
   - Avoid absolute paths
   - No embedded credentials or secrets

### Testing Templates

```bash
# Validate template syntax
pnpm run template:validate

# Test template generation
pnpm run template:test

# Full E2E template testing
pnpm test
```

## Documentation

### Documentation Requirements

**For New Features:**
- Update relevant documentation files
- Add examples and usage patterns
- Update CLI help text
- Add changelog entry

**For API Changes:**
- Update type definitions
- Document breaking changes
- Provide migration guide if needed

### Documentation Types

1. **User Documentation** (`docs/`)
   - Getting started guides
   - API reference
   - Examples and tutorials

2. **Developer Documentation**
   - Code comments
   - Architecture decisions
   - Contributing guidelines

3. **Generated Documentation**
   - TypeScript API docs
   - CLI help text

## Submitting Changes

### Pull Request Process

1. **Create Descriptive PR**:
   ```markdown
   ## Summary
   Brief description of changes
   
   ## Changes Made
   - Specific change 1
   - Specific change 2
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] E2E tests pass
   - [ ] Manual testing completed
   
   ## Breaking Changes
   None / List any breaking changes
   
   Fixes #123
   ```

2. **PR Requirements**:
   - All tests must pass
   - Code coverage should not decrease significantly
   - Documentation updated if needed
   - No merge conflicts

3. **Review Process**:
   - Address all reviewer comments
   - Keep discussions focused and constructive
   - Be willing to iterate on your solution

### Commit Guidelines

Use [Conventional Commits](https://conventionalcommits.org/):

```bash
feat: add support for custom Docker images
fix: resolve template validation for nested directories
docs: update installation guide with mise setup
test: add E2E tests for multi-database configuration
refactor: simplify configuration validation logic
```

**Commit Types:**
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/modifications
- `refactor:` Code refactoring
- `chore:` Build process, dependency updates

## Review Process

### What Reviewers Look For

1. **Functionality**
   - Does the code solve the stated problem?
   - Are edge cases handled properly?
   - Is error handling appropriate?

2. **Code Quality**
   - Is the code readable and maintainable?
   - Are variable names descriptive?
   - Is the logic easy to follow?

3. **Testing**
   - Are there sufficient tests?
   - Do tests cover edge cases?
   - Are tests maintainable?

4. **Security**
   - Are user inputs validated?
   - Are file operations secure?
   - Are there any potential vulnerabilities?

### Responding to Reviews

- **Be receptive** to feedback
- **Ask questions** if comments are unclear
- **Explain your reasoning** when you disagree
- **Make requested changes** promptly
- **Test thoroughly** after making changes

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Help others learn and contribute
- Provide constructive feedback
- Welcome newcomers

### Getting Help

- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bug reports and feature requests
- **Code reviews** for technical guidance
- **Documentation** for comprehensive guides

### Communication

- Use clear, descriptive language
- Provide context for your questions
- Share relevant code snippets or logs
- Be patient with responses

## Common Contribution Areas

### Easy First Contributions

- Documentation improvements
- Test coverage expansion
- Bug fixes with clear reproduction steps
- Template enhancements

### Advanced Contributions

- New CLI features
- Template system improvements
- Performance optimizations
- Security enhancements

### Ongoing Needs

- Cross-platform testing
- Performance benchmarking
- Documentation examples
- Integration with new tools

## Release Process

### Version Management

Spanwright follows semantic versioning:
- **Major** (x.0.0): Breaking changes
- **Minor** (x.y.0): New features, backwards compatible
- **Patch** (x.y.z): Bug fixes

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped appropriately
- [ ] Git tags created
- [ ] NPM package published

## License

By contributing to Spanwright, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Spanwright! Your efforts help make this tool better for everyone. 🚀