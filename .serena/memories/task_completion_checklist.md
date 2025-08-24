# Task Completion Checklist

## Before Committing Changes

### 1. Code Quality Checks
```bash
# Run linting and fix issues
npm run lint
npm run fix  # if needed

# Ensure code formatting is correct
npm run format
```

### 2. Build Verification
```bash
# Clean and rebuild
npm run clean
npm run build

# Verify build artifacts in dist/
```

### 3. Testing Requirements
```bash
# CRITICAL: Run E2E tests before committing
npm test

# Also run unit tests with coverage
npm run test:unit:coverage

# Verify coverage thresholds are met:
# - Statements: 85%
# - Branches: 90% 
# - Functions: 95%
# - Lines: 85%
```

### 4. Template Validation (if template changes)
```bash
# Test generated project works
npx spanwright ci-test-project
cd ci-test-project
make init
make test
```

### 5. Security Validation
- Ensure no secrets are committed
- Verify path traversal protections are in place
- Check input validation for user inputs

## Environment Verification
- **Docker**: Running and accessible
- **wrench**: Installed and in PATH
- **spalidate**: Available if testing validation features
- **Node.js**: Version >= 22.15.1

## Git Workflow
- Create meaningful commit messages
- Reference issue numbers if applicable
- Consider running GitHub Actions locally if possible

## Critical Note
⚠️ **ALWAYS run `npm test` before committing** - This runs the full E2E pipeline that validates the entire CLI generation and testing workflow.