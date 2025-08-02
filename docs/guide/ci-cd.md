# CI/CD Integration

Complete guide to integrating Spanwright E2E tests into your CI/CD pipelines with GitHub Actions, GitLab CI, and other platforms.

## Overview

Spanwright E2E tests can be seamlessly integrated into CI/CD pipelines, providing automated testing of your Cloud Spanner applications with browser automation and database validation.

## GitHub Actions

### Complete Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "22"
  GO_VERSION: "1.23"

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    services:
      spanner-emulator:
        image: gcr.io/cloud-spanner-emulator/emulator:latest
        ports:
          - 9010:9010
          - 9020:9020
        options: >-
          --health-cmd="curl -f http://localhost:9020"
          --health-interval=30s
          --health-timeout=10s
          --health-retries=5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Install system dependencies
        run: |
          # Install wrench for schema management
          go install github.com/cloudspannerecosystem/wrench@latest
          
          # Install spalidate for validation
          go install github.com/nu0ma/spalidate@latest
          
          # Install Playwright browsers
          npx playwright install --with-deps

      - name: Build project
        run: |
          make build
          chmod +x cmd/seed-injector/seed-injector

      - name: Setup Spanner environment
        run: |
          # Create Spanner instance and databases
          make setup-emulator
          
          # Apply database schemas
          make apply-schemas

      - name: Run E2E tests
        run: |
          make run-all-scenarios
        env:
          SPANNER_EMULATOR_HOST: localhost:9010
          SPANNER_PROJECT_ID: test-project
          SPANNER_INSTANCE_ID: test-instance

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            scenarios/*/test-results/
            scenarios/*/playwright-report/
          retention-days: 7

      - name: Upload validation reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: validation-reports
          path: reports/validation-*.json
          retention-days: 7

      - name: Comment PR with results
        if: github.event_name == 'pull_request' && failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            
            let comment = '## ❌ E2E Tests Failed\n\n';
            
            // Add validation results if available
            const reportsDir = 'reports';
            if (fs.existsSync(reportsDir)) {
              const reports = fs.readdirSync(reportsDir)
                .filter(file => file.includes('validation'));
              
              if (reports.length > 0) {
                comment += '### Validation Failures:\n';
                // Process validation reports
              }
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Matrix Testing

Test across multiple configurations:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
    browser: [chromium, firefox, webkit]
    database-count: [1, 2]
  fail-fast: false

steps:
  - name: Run tests with matrix config
    run: |
      export DB_COUNT=${{ matrix.database-count }}
      export PLAYWRIGHT_BROWSER=${{ matrix.browser }}
      make run-all-scenarios
```

### Parallel Testing

```yaml
jobs:
  test-scenarios:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scenario: 
          - example-01-basic-setup
          - example-02-user-flow
          - example-03-complex-workflow
    
    steps:
      - name: Run scenario ${{ matrix.scenario }}
        run: |
          make run-scenario SCENARIO=${{ matrix.scenario }}
```

## GitLab CI

### Complete Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - setup
  - test
  - cleanup

variables:
  NODE_VERSION: "22"
  GO_VERSION: "1.23"
  SPANNER_EMULATOR_HOST: "spanner-emulator:9010"

services:
  - name: gcr.io/cloud-spanner-emulator/emulator:latest
    alias: spanner-emulator
    command: ["./gateway_main", "--hostname", "0.0.0.0"]

setup:
  stage: setup
  image: node:22
  before_script:
    - apt-get update && apt-get install -y wget
    - wget https://go.dev/dl/go1.23.linux-amd64.tar.gz
    - tar -C /usr/local -xzf go1.23.linux-amd64.tar.gz
    - export PATH=$PATH:/usr/local/go/bin
  script:
    - npm ci
    - go install github.com/cloudspannerecosystem/wrench@latest
    - go install github.com/nu0ma/spalidate@latest
    - npx playwright install --with-deps
  artifacts:
    paths:
      - node_modules/
      - ~/.cache/ms-playwright/
    expire_in: 1 hour

e2e-tests:
  stage: test
  image: node:22
  dependencies:
    - setup
  script:
    - export PATH=$PATH:/usr/local/go/bin:~/go/bin
    - make build
    - make setup-emulator
    - make apply-schemas
    - make run-all-scenarios
  artifacts:
    when: always
    paths:
      - scenarios/*/test-results/
      - scenarios/*/playwright-report/
      - reports/
    expire_in: 1 week
    reports:
      junit: scenarios/*/test-results/results.xml
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '22'
        GO_VERSION = '1.23'
        SPANNER_EMULATOR_HOST = 'localhost:9010'
    }
    
    stages {
        stage('Setup') {
            steps {
                // Install dependencies
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
                
                // Install Go tools
                sh 'go install github.com/cloudspannerecosystem/wrench@latest'
                sh 'go install github.com/nu0ma/spalidate@latest'
            }
        }
        
        stage('Start Services') {
            steps {
                // Start Spanner emulator
                sh 'docker run -d --name spanner-emulator -p 9010:9010 -p 9020:9020 gcr.io/cloud-spanner-emulator/emulator:latest'
                
                // Wait for emulator to be ready
                sh 'timeout 60 sh -c "until curl -f http://localhost:9020; do sleep 2; done"'
            }
        }
        
        stage('Build and Setup') {
            steps {
                sh 'make build'
                sh 'make setup-emulator'
                sh 'make apply-schemas'
            }
        }
        
        stage('Run E2E Tests') {
            steps {
                sh 'make run-all-scenarios'
            }
            post {
                always {
                    // Archive test results
                    archiveArtifacts artifacts: 'scenarios/*/test-results/**/*', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'scenarios/*/playwright-report/**/*', allowEmptyArchive: true
                    
                    // Publish test results
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'scenarios/example-01-basic-setup/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            // Cleanup
            sh 'docker stop spanner-emulator || true'
            sh 'docker rm spanner-emulator || true'
        }
    }
}
```

## Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '22'
  goVersion: '1.23'

stages:
- stage: E2ETests
  displayName: 'E2E Tests'
  jobs:
  - job: RunTests
    displayName: 'Run E2E Tests'
    
    services:
      spanner-emulator:
        image: gcr.io/cloud-spanner-emulator/emulator:latest
        ports:
          - 9010:9010
          - 9020:9020
    
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: $(nodeVersion)
      displayName: 'Install Node.js'
    
    - task: GoTool@0
      inputs:
        version: $(goVersion)
      displayName: 'Install Go'
    
    - script: |
        npm ci
        npx playwright install --with-deps
      displayName: 'Install dependencies'
    
    - script: |
        go install github.com/cloudspannerecosystem/wrench@latest
        go install github.com/nu0ma/spalidate@latest
      displayName: 'Install Go tools'
    
    - script: |
        make build
        make setup-emulator
        make apply-schemas
      displayName: 'Setup environment'
      env:
        SPANNER_EMULATOR_HOST: localhost:9010
    
    - script: make run-all-scenarios
      displayName: 'Run E2E tests'
      env:
        SPANNER_EMULATOR_HOST: localhost:9010
        SPANNER_PROJECT_ID: test-project
        SPANNER_INSTANCE_ID: test-instance
    
    - task: PublishTestResults@2
      condition: always()
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'scenarios/*/test-results/results.xml'
        mergeTestResults: true
      displayName: 'Publish test results'
    
    - task: PublishHtmlReport@1
      condition: always()
      inputs:
        reportDir: 'scenarios/example-01-basic-setup/playwright-report'
        tabName: 'Playwright Report'
      displayName: 'Publish Playwright report'
```

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.1.0
  go: circleci/go@1.9.1

jobs:
  e2e-tests:
    docker:
      - image: cimg/node:22-browsers
      - image: gcr.io/cloud-spanner-emulator/emulator:latest
        command: [./gateway_main, --hostname, 0.0.0.0]
    
    environment:
      SPANNER_EMULATOR_HOST: localhost:9010
      SPANNER_PROJECT_ID: test-project
      SPANNER_INSTANCE_ID: test-instance
    
    steps:
      - checkout
      
      - go/install:
          version: "1.23"
      
      - node/install-packages:
          pkg-manager: npm
      
      - run:
          name: Install system dependencies
          command: |
            go install github.com/cloudspannerecosystem/wrench@latest
            go install github.com/nu0ma/spalidate@latest
            npx playwright install --with-deps
      
      - run:
          name: Build project
          command: make build
      
      - run:
          name: Setup Spanner environment
          command: |
            make setup-emulator
            make apply-schemas
      
      - run:
          name: Run E2E tests
          command: make run-all-scenarios
      
      - store_artifacts:
          path: scenarios/*/test-results
      
      - store_artifacts:
          path: scenarios/*/playwright-report
      
      - store_test_results:
          path: scenarios/*/test-results

workflows:
  test:
    jobs:
      - e2e-tests
```

## Environment Configuration

### CI-Specific Environment Variables

```bash
# Common CI environment variables
CI=true
PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright
PLAYWRIGHT_HEADED=false
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false

# Spanner emulator configuration
SPANNER_EMULATOR_HOST=localhost:9010
SPANNER_PROJECT_ID=test-project
SPANNER_INSTANCE_ID=test-instance

# Database configuration
PRIMARY_DB_NAME=primary-test-db
SECONDARY_DB_NAME=secondary-test-db

# Performance tuning
PLAYWRIGHT_WORKERS=1
PLAYWRIGHT_TIMEOUT=30000
```

### Docker Compose for Local CI

```yaml
# docker-compose.ci.yml
version: '3.8'

services:
  spanner-emulator:
    image: gcr.io/cloud-spanner-emulator/emulator:latest
    ports:
      - "9010:9010"
      - "9020:9020"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9020"]
      interval: 30s
      timeout: 10s
      retries: 5

  e2e-tests:
    build: .
    depends_on:
      spanner-emulator:
        condition: service_healthy
    environment:
      - SPANNER_EMULATOR_HOST=spanner-emulator:9010
      - CI=true
    volumes:
      - ./scenarios:/app/scenarios
      - ./reports:/app/reports
    command: make run-all-scenarios
```

## Performance Optimization

### Caching Strategies

```yaml
# GitHub Actions caching
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      ~/.cache/ms-playwright
      ~/go/pkg/mod
    key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json', '**/go.sum') }}

- name: Cache Playwright browsers
  uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

### Parallel Execution

```makefile
# Makefile optimization for CI
run-all-scenarios-parallel:
	@scenarios=$$(find scenarios -name "Makefile" -exec dirname {} \;); \
	echo "$$scenarios" | xargs -n1 -P$(shell nproc) -I{} make run-scenario SCENARIO=$$(basename {})
```

## Monitoring and Reporting

### Test Result Integration

```typescript
// tests/utils/ci-reporter.ts
export class CIReporter {
  static async reportResults(results: TestResult[]) {
    if (process.env.GITHUB_ACTIONS) {
      await this.reportToGitHub(results);
    } else if (process.env.GITLAB_CI) {
      await this.reportToGitLab(results);
    }
  }
  
  private static async reportToGitHub(results: TestResult[]) {
    const summary = results.reduce((acc, result) => {
      acc.passed += result.passed ? 1 : 0;
      acc.failed += result.passed ? 0 : 1;
      return acc;
    }, { passed: 0, failed: 0 });
    
    console.log(`::notice title=E2E Results::Passed: ${summary.passed}, Failed: ${summary.failed}`);
    
    if (summary.failed > 0) {
      console.log(`::error title=E2E Tests Failed::${summary.failed} scenarios failed`);
    }
  }
}
```

### Slack Notifications

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    channel: '#ci-alerts'
    text: |
      E2E tests failed in ${{ github.repository }}
      Branch: ${{ github.ref }}
      Commit: ${{ github.sha }}
      View results: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Best Practices

### CI/CD Strategy

1. **Fast feedback** - Run critical tests on every commit
2. **Comprehensive testing** - Full test suite on main branch
3. **Parallel execution** - Use matrix strategies for speed
4. **Resource management** - Clean up resources after tests

### Security

1. **No secrets in logs** - Mask sensitive environment variables
2. **Isolated environments** - Use separate test databases
3. **Secure emulator** - Don't expose emulator ports unnecessarily
4. **Access control** - Limit CI permissions to minimum required

### Reliability

1. **Retry mechanisms** - Retry flaky tests automatically
2. **Health checks** - Verify service availability before tests
3. **Timeout configuration** - Set appropriate timeouts for CI
4. **Artifact collection** - Always collect test artifacts

See [Troubleshooting](./troubleshooting) for CI-specific debugging and [Writing Tests](./writing-tests) for test optimization techniques.