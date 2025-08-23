# Spanwright

CLI tool for generating Cloud Spanner E2E testing framework projects with Go database tools and Playwright browser automation.

[![npm version](https://img.shields.io/npm/v/spanwright)](https://www.npmjs.com/package/spanwright)
[![CI](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml/badge.svg)](https://github.com/nu0ma/spanwright/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nu0ma/spanwright)

## Quick Start

```bash
# Create a new E2E test project
npx spanwright your-project-name

# Navigate and initialize
cd your-project-name
make init

# Run all test scenarios
make test
```

## Features

- **Scenario-based Testing** - Structured tests with seed data and browser automation
- **Zero Config Setup** - Docker Spanner emulator management included  
- **Go + Playwright** - Database tools with browser testing integration
- **Multi-database Support** - Handle 1 or 2 Spanner databases per project

## Tech Stack

Generated projects use:
- **[Playwright](https://playwright.dev)** - Browser automation
- **[testfixtures](https://github.com/go-testfixtures/testfixtures)** - YAML-based database seeding
- **[wrench](https://github.com/cloudspannerecosystem/wrench)** - Spanner schema migrations
- **[spalidate](https://github.com/nu0ma/spalidate)** - Database state validation
- **[Cloud Spanner Go Client](https://cloud.google.com/go/spanner)** - Official Google client

## Prerequisites

- **Node.js** >= 22.0.0
- **Docker** - For Spanner emulator
- **Go** - For database tools
- **wrench** - Install: `go install github.com/cloudspannerecosystem/wrench@latest`
- **spalidate** - Install from [github.com/nu0ma/spalidate](https://github.com/nu0ma/spalidate)

## Project Structure

```
your-project-name/
├── Makefile                    # Workflow automation
├── schema/                     # Database schemas (.sql files)
├── cmd/seed-injector/         # Go data seeding tool
├── scenarios/                  # Test scenarios
│   └── example-01-basic-setup/
│       ├── fixtures/          # YAML seed data
│       ├── expected-*.yaml    # Expected database state
│       └── tests/             # Playwright E2E tests
├── tests/                      # Test infrastructure
└── playwright.config.ts       # Playwright configuration
```

## Common Commands

```bash
# Project setup
make init                       # Initialize project and install dependencies
make start                      # Start Spanner emulator
make setup                      # Setup databases and schemas

# Testing
make test                       # Run complete E2E test workflow
make test-scenario SCENARIO=name  # Run E2E test for a specific scenario

# Utilities
make stop                       # Stop Spanner emulator
make help                       # Show available commands
```


## License

MIT License - see [LICENSE](LICENSE) for details.