# Development Workflow

## Pre-commit Requirements

### Linting
- **Required**: Run `pnpm lint` before committing to fix any linting errors
- Do not commit with remaining linting errors
- For TypeScript projects, ensure both type checking and code style compliance

### Testing
- Run `pnpm test` to verify E2E tests pass
- Fix any test failures before committing

### Build
- Run `pnpm run build` to ensure no build errors

## Pre-commit Checklist
1. `pnpm lint` - Fix linting errors
2. `pnpm test` - Run E2E tests
3. `pnpm run build` - Verify build
4. Commit changes