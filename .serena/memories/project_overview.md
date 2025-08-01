# Spanwright Project Overview

## Purpose
Spanwright is a CLI tool that generates Cloud Spanner E2E testing framework projects. It creates complete project scaffolds with Go database tools and Playwright browser automation.

## Key Architecture
- **Two-Part System**: Generator (TypeScript CLI) + Template (Complete project scaffold)
- **Generator** (`src/index.ts`): Interactive CLI that creates projects with database configuration
- **Template** (`template/`): Complete project scaffold with Go tools, Playwright tests, and Make workflows

## Technology Stack
- **TypeScript**: CLI generator and Playwright test framework (CommonJS, ES2020 target)
- **Go**: High-performance database tools (validation, seeding, connection pooling)
- **Make**: Workflow automation and Docker orchestration
- **Playwright**: Browser automation with shared database configuration
- **Docker**: Spanner emulator hosting
- **External tools**: wrench (schema migrations), spalidate (database validation)

## Core Features
- **Scenario-based Testing**: Structured tests with minimal seed data and inline E2E tests
- **Multi-database Support**: Configurable for 1 or 2 Spanner databases per project
- **Zero Config Setup**: Docker Spanner emulator management included
- **Interactive/Non-interactive modes**: CLI supports both modes with environment variable configuration

## Generated Project Structure
```
project-name/
├── Makefile                    # Workflow automation
├── cmd/seed-injector/         # Go CLI for data seeding
├── internal/spanwright/       # Go internal packages
├── scenarios/                 # Test scenarios with fixtures and tests
├── tests/                     # Test infrastructure
└── playwright.config.ts       # Playwright configuration
```