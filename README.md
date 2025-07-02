# spanwright

Cloud Spanner E2E testing framework project generator

## Usage

```bash
# Create a new E2E test project
npx spanwright your-project-name

# Navigate to the project
cd your-project-name

# Initial setup
make init

# Run samples
make run-all-examples
```

## Features

- **Flexible DB configuration**: Supports 1 or 2 Spanner databases
- **Interactive setup**: CLI automates DB configuration
- **Playwright integration**: Combines browser operations with DB validation
- **Scenario-based testing**: Detailed validation through YAML configuration
- **Includes samples**: Ready-to-run examples for quick verification

## Prerequisites

- **wrench**: Spanner schema migration tool
- **Docker**: For running Spanner emulator
- **Node.js**: For Playwright test execution

## Generated Project Structure

```
your-project-name/
├── Makefile                 # Main operation commands
├── scenarios/               # Test scenarios
│   └── example-01-basic-setup/  # Sample
├── cmd/                     # Go-based tools
├── tests/                   # Playwright tests
└── README.md               # Usage instructions
```

## License

MIT