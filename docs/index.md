---
layout: home

hero:
  name: "Spanwright"
  text: "Cloud Spanner E2E Testing"
  tagline: "Generate comprehensive testing frameworks with Go database tools and Playwright browser automation"
  image:
    src: /logo.svg
    alt: Spanwright
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/nu0ma/spanwright

features:
  - icon: 🚀
    title: Zero Config Setup
    details: One command creates a complete E2E testing environment with Docker Spanner emulator management
  - icon: 🎭
    title: Playwright Integration
    details: Full browser automation with database state validation and multi-browser support
  - icon: 🗄️
    title: Database-First Testing
    details: YAML-based seeding, schema migrations, and declarative validation with real Spanner features
  - icon: 📊
    title: Scenario Organization
    details: Structured test scenarios with isolated seed data and expected database states
  - icon: ⚡
    title: Go Performance
    details: High-performance database tools with retry logic and connection management
  - icon: 🔧
    title: Battle-Tested Stack
    details: Built on testfixtures, wrench, spalidate, and official Cloud Spanner Go client
---

## Quick Example

```bash
# Create new project
npx spanwright my-spanner-tests

# Initialize and run
cd my-spanner-tests
make init
make run-all-scenarios
```

## Use Cases

- **E2E Testing** - Test web applications with real Spanner database interactions
- **Integration Testing** - Validate complex database schemas and data flows  
- **Performance Testing** - Benchmark database operations with realistic data
- **Schema Validation** - Verify migration scripts and schema changes

## Tech Stack

Generated projects leverage proven tools:

- **[Playwright](https://playwright.dev)** - Modern browser automation
- **[testfixtures](https://github.com/go-testfixtures/testfixtures)** - YAML database seeding
- **[wrench](https://github.com/cloudspannerecosystem/wrench)** - Spanner schema migrations
- **[spalidate](https://github.com/nu0ma/spalidate)** - Database state validation
- **[Cloud Spanner Go Client](https://cloud.google.com/go/spanner)** - Official Google client