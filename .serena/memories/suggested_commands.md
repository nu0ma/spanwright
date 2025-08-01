# Suggested Commands for Spanwright Development

## Core Development Commands
```bash
# Build TypeScript CLI to dist/
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean

# Build before publishing
npm run prepare
```

## Testing Commands
```bash
# Run E2E tests (recommended before commits)
npm test

# Run unit tests only
npm run test:unit

# Watch unit tests during development
npm run test:unit:watch

# Generate coverage report
npm run test:unit:coverage

# Run all tests (unit + E2E)
npm run test:all

# Interactive test UI
npm run test:unit:ui
```

## Code Quality Commands
```bash
# Run all linting
npm run lint

# Fix ESLint issues
npm run fix:eslint

# Fix Prettier formatting
npm run fix:prettier

# Fix all code style issues
npm run fix

# Format TypeScript files
npm run format
```

## Version Management
```bash
# Update Go version across all templates and configs
npm run update-go-version <version>

# Example: Update to Go 1.24.3
npm run update-go-version 1.24.3
```

## Testing Generated Projects
```bash
# Create test project
npx spanwright test-project

# Initialize and run generated project
cd test-project
make init
make run-all-scenarios
```

## System Requirements Check
- **Docker**: `docker version` (must be running)
- **wrench**: `wrench version` (for schema migrations)  
- **Go**: Check version in `.tool-versions` file
- **Node.js**: >= 22.15.1