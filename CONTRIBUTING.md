# Contributing to Spanwright

Thank you for your interest in contributing to Spanwright! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/spanwright.git
   cd spanwright
   ```
3. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   ```
4. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Development Setup

### Prerequisites
- Node.js >= 22.0.0
- pnpm >= 9.0.0
- Docker (for Spanner emulator)
- Go (for testing generated projects)
- wrench (Spanner migration tool)

### Development Commands

```bash
# Build the CLI
pnpm run build

# Watch mode for development
pnpm run dev

# Run E2E tests
pnpm test
```

## Project Structure

- `src/` - CLI generator source code
- `template/` - Project template files
- `scripts/` - Development and validation scripts

## Contributing Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code conventions
- Add comments for complex logic
- Use meaningful variable and function names

### Template Changes
When modifying templates:
1. **Always test** before committing:
   ```bash
   pnpm test
   ```

### Testing
- All template changes must pass validation
- E2E tests should pass on generated projects
- Include test scenarios for new features

### Commit Guidelines
- Use clear, descriptive commit messages
- Keep commits focused on single changes
- Reference issues where applicable

Example commit messages:
- `feat: add support for custom schema paths`
- `fix: resolve template validation for Go files`
- `docs: update README with new prerequisites`

## Submitting Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test thoroughly

3. **Commit your changes**:
   ```bash
   git commit -m "feat: add your feature description"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

## Pull Request Guidelines

- Provide a clear description of changes
- Include screenshots for UI changes
- Reference related issues
- Ensure all tests pass
- Update documentation if needed

## Reporting Issues

When reporting issues:
- Use the issue templates
- Provide reproduction steps
- Include environment details
- Add relevant logs or error messages

## Template Development

### Template Structure
Templates use Go text/template syntax:
- `{{.ProjectName}}` - Project name
- `{{.DatabaseConfig}}` - Database configuration
- `{{.HasSecondaryDB}}` - Boolean for dual-DB setup

### Validation Rules
- All Go files must compile
- TypeScript files must pass type checking
- YAML/JSON files must be valid
- No hardcoded paths or credentials

## Community

- Be respectful and inclusive
- Help others learn and contribute
- Follow the Code of Conduct
- Ask questions if you're unsure

## License

By contributing, you agree that your contributions will be licensed under the MIT License.