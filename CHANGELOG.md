# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.0.3] - 2025-07-03

### ✨ Features
- feat: add automated npm release workflow with changelog generation ([41fcd86](https://github.com/nu0ma/spanwright/commit/41fcd86))

### 🐛 Bug Fixes
- fix: escape regex special characters in changelog generation script ([8a2c10b](https://github.com/nu0ma/spanwright/commit/8a2c10b))


## [Unreleased]

### Added
- Initial open-source release preparation
- Contributing guidelines and community documentation
- Security policy and code of conduct
- GitHub issue and pull request templates

### Changed
- Enhanced documentation for community contribution
- Improved security practices for public repository

### Security
- Removed sensitive data from repository
- Enhanced .gitignore for development testbed protection

## [0.0.1] - 2024-12-XX

### Added
- Initial CLI tool for generating Cloud Spanner E2E testing frameworks
- Interactive project setup with database configuration
- Template system for Go tools and Playwright tests
- Development testbed for template validation
- Support for single and dual database configurations
- Docker-based Spanner emulator integration
- Make-based workflow automation
- Scenario-based testing framework
- Database isolation for parallel test execution
- Comprehensive validation tools for templates
- E2E testing pipeline with browser automation

### Features
- **CLI Generator**: Interactive project creation with `npx spanwright`
- **Go Database Tools**: High-performance validation and seeding tools
- **Playwright Integration**: Browser automation with database validation
- **Template Validation**: Automated syntax checking for Go, TypeScript, and YAML
- **Development Workflows**: Complete Make-based automation
- **Flexible Configuration**: Support for 1-2 Spanner databases
- **Docker Integration**: Automated emulator management
- **Scenario Testing**: Structured test data and validation

### Prerequisites
- Node.js >= 22.0.0
- Docker for Spanner emulator
- wrench for schema migrations
- Go for generated project tools

### Known Issues
- Template validation requires all prerequisites to be installed
- Development testbed creates temporary files that need cleanup
- Some template paths are hardcoded for development setup

---

## Release Notes

### Version 0.0.1
This is the initial release of Spanwright, a project generator for Cloud Spanner E2E testing frameworks. The tool provides:

- **Complete Project Generation**: Creates ready-to-use testing frameworks with Go tools and Playwright integration
- **Database Flexibility**: Supports both single and dual database configurations
- **Testing Infrastructure**: Includes scenario-based testing with data isolation
- **Development Tools**: Comprehensive validation and development workflows
- **Docker Integration**: Automated Spanner emulator management

The generated projects include:
- Go-based database validation and seeding tools
- Playwright browser automation tests
- Make-based workflow automation
- Scenario-based test organization
- Database isolation for parallel execution

For usage instructions, see the [README](README.md).
For contributing guidelines, see [CONTRIBUTING](CONTRIBUTING.md).