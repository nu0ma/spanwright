# Technology Stack Details

## TypeScript Configuration
- **Target**: ES2020, CommonJS modules
- **Strict Mode**: Enabled with full type checking
- **Build Output**: `dist/` directory
- **Source Maps**: Enabled for debugging

## Code Quality Tools
- **ESLint**: TypeScript rules with strict configuration
- **Prettier**: Code formatting with specific rules:
  - Single quotes, semicolons, 100 char print width
  - 2-space tabs, LF line endings
- **Vitest**: Unit testing with coverage thresholds (85% statements, 90% branches, 95% functions)

## Node.js Requirements
- **Minimum Version**: Node.js >= 22.15.1 (CLI generator)
- **Generated Projects**: Node.js >= 16.0.0

## External Dependencies
- **wrench**: Spanner schema migration tool (must be installed globally)
- **spalidate**: Database validation tool (from github.com/nu0ma/spalidate)
- **Docker**: Required for Spanner emulator
- **Go**: For database tools in generated projects

## Go Tools (in Template)
- **Connection Management**: Pooled Spanner connections for performance
- **Seed Injector**: SQL-based data seeding with direct DML execution
- **Internal Packages**: config, db interfaces, retry logic