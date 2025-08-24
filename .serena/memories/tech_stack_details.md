# Technology Stack Details

## CLI Generator Stack

### TypeScript Configuration
- **Target**: ES2020, CommonJS modules for Node.js compatibility
- **Strict Mode**: Enabled with full type checking
- **Build System**: tsdown for fast compilation and bundling
- **Output**: `dist/` directory with optimized bundles
- **Source Maps**: Enabled for debugging

### Node.js Requirements
- **CLI Generator**: Node.js >= 22.15.1 (latest LTS)
- **Generated Projects**: Node.js >= 16.0.0 (broader compatibility)
- **Package Manager**: pnpm >= 10.0.0 (performance and security)

### Dependencies
- **Core**: 
  - `consola`: Enhanced console logging
  - `gunshi`: CLI argument parsing and validation
- **Development**:
  - TypeScript 5.8.3
  - ESLint with TypeScript rules
  - Prettier for code formatting
  - Vitest for unit testing with coverage

## Generated Project Stack

### Go Ecosystem
- **Version Management**: Specified in `.tool-versions` (mise/asdf compatible)
- **Module System**: Go modules with `go.mod.template`
- **Internal Packages**: 
  - `config/`: Environment validation and database configuration
  - `db/`: Spanner client interfaces with pooled connections
  - `retry/`: Resilient operation patterns for database operations
- **External Dependencies**:
  - Cloud Spanner Go Client (official Google SDK)
  - testfixtures for YAML-based seeding

### Frontend/Testing Stack
- **Playwright**: Browser automation framework
  - TypeScript configuration
  - Shared database configuration
  - Parallel test execution support
- **Test Infrastructure**:
  - Global setup/teardown patterns
  - Database isolation strategies
  - SQL validation utilities

### Infrastructure Tools
- **Docker**: Spanner emulator hosting
- **Make**: POSIX-compatible workflow automation
- **External Tools**:
  - `wrench`: Spanner schema migration tool
  - `spalidate`: Database state validation tool

## Code Quality Tools

### Linting & Formatting
- **ESLint**: TypeScript-specific rules with strict configuration
  - Simple import sorting
  - Unused import detection
  - TypeScript-specific best practices
- **Prettier**: Consistent code formatting
  - Single quotes, semicolons required
  - 100 character print width
  - 2-space indentation, LF line endings

### Testing Framework
- **Vitest**: Modern test runner with TypeScript support
  - Unit testing with comprehensive coverage
  - Coverage thresholds: 85% statements, 90% branches, 95% functions
  - UI mode for development
  - Watch mode for continuous testing
- **E2E Testing**: Custom shell-based integration tests
  - Full CLI → project generation → test execution flow
  - Docker environment management
  - Cross-platform compatibility

## Security & Performance

### Security Features
- **Path Traversal Protection**: All file operations validated
- **Input Validation**: Comprehensive parameter checking
- **Secure Template Processing**: Safe string replacement
- **Temporary File Handling**: Secure creation and cleanup
- **No Secrets in Templates**: All sensitive data externalized

### Performance Optimizations
- **Build System**: 
  - tsdown for fast TypeScript compilation
  - Tree-shaking and dead code elimination
  - Optimized bundle sizes
- **Database Operations**:
  - Pooled Spanner connections for reduced latency
  - Batch operations to minimize N+1 patterns
  - Connection reuse across operations
- **Test Execution**:
  - Parallel test execution with process isolation
  - Efficient database state management
  - Minimized fixture data sets

## External Dependencies

### Required Tools
- **wrench**: Spanner schema migration tool
  - Installation: `go install github.com/cloudspannerecosystem/wrench@latest`
  - Purpose: Database schema management and migrations
- **spalidate**: Database validation tool
  - Installation: From github.com/nu0ma/spalidate
  - Purpose: Comprehensive database state validation
- **Docker**: Container runtime
  - Purpose: Spanner emulator hosting
  - Requirement: Docker daemon access

### Version Synchronization
- **Single Source of Truth**: `.tool-versions` file
- **Tool Compatibility**: mise and asdf support
- **Automated Updates**: GitHub Actions for Go version management
- **CI/CD Integration**: Version consistency across environments

## Build & Distribution

### Package Configuration
- **NPM Package**: ES modules with CommonJS compatibility
- **Binary Distribution**: CLI executable via `bin` field
- **Published Files**: `dist/` (compiled CLI) + `template/` (project scaffold)
- **Registry**: Public NPM registry with automated publishing