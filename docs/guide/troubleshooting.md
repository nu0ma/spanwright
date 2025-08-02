# Troubleshooting

Comprehensive guide to diagnosing and resolving common issues with Spanwright.

## Quick Diagnostics

When encountering issues, start with these diagnostic commands:

```bash
# Check project configuration
make validate

# Verify required tools
make check-tools

# Test emulator connectivity
make start && docker ps | grep spanner-emulator

# Check recent logs
docker logs spanner-emulator
```

## Installation Issues

### Node.js Version Problems

**Symptom:**
```
Error: This package requires Node.js >= 22.0.0
```

**Solution:**
```bash
# Check current version
node --version

# Install correct version with nvm
nvm install 22
nvm use 22

# Or upgrade using package manager
brew install node@22  # macOS
```

### Docker Permission Issues

**Symptom:**
```
❌ docker not found
permission denied while trying to connect to the Docker daemon
```

**Solution for Linux:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify docker works
docker run hello-world
```

**Solution for macOS/Windows:**
```bash
# Ensure Docker Desktop is running
open -a Docker  # macOS
# Or start Docker Desktop manually
```

### Go Tool Installation

**Symptom:**
```
❌ wrench not found
❌ spalidate not found
```

**Solution:**
```bash
# Install wrench
go install github.com/cloudspannerecosystem/wrench@latest

# Install spalidate
git clone https://github.com/nu0ma/spalidate.git
cd spalidate
go install ./cmd/spalidate

# Verify installation
wrench --version
spalidate --version

# If still not found, check GOPATH
echo $GOPATH/bin
export PATH=$PATH:$(go env GOPATH)/bin
```

## Project Creation Issues

### Environment Variable Problems

**Symptom:**
```
❌ SPANWRIGHT_DB_COUNT=1
```

**Solution:**
```bash
# Check current environment
env | grep SPANWRIGHT

# Set correct values
export SPANWRIGHT_DB_COUNT=1
export SPANWRIGHT_PRIMARY_DB_NAME=my-db
export SPANWRIGHT_PRIMARY_SCHEMA_PATH=./schema

# Clear incorrect values
unset SPANWRIGHT_DB_COUNT
```

### Template Processing Errors

**Symptom:**
```
Error: template: invalid character in action
```

**Solution:**
```bash
# This typically indicates special characters in project names
# Use only alphanumeric characters, hyphens, and underscores

# Valid project names
npx spanwright my-project
npx spanwright test_project_123
npx spanwright e-commerce-tests

# Invalid project names  
npx spanwright my@project      # Contains @
npx spanwright my project      # Contains space
npx spanwright my.project      # Contains dot
```

### File Permission Issues

**Symptom:**
```
EACCES: permission denied, mkdir '/path/to/project'
```

**Solution:**
```bash
# Check directory permissions
ls -la /path/to/parent/directory

# Create project in writable location
cd ~/projects  # Or another writable directory
npx spanwright my-project

# Fix permissions if needed
sudo chown -R $USER:$USER /path/to/project
```

## Docker & Emulator Issues

### Emulator Won't Start

**Symptom:**
```
❌ Emulator container not running
```

**Diagnostic Steps:**
```bash
# Check if container exists but stopped
docker ps -a | grep spanner-emulator

# Check container logs
docker logs spanner-emulator

# Check port conflicts
lsof -i :9010  # macOS/Linux
netstat -ano | findstr :9010  # Windows

# Try manual start
docker run -d --name spanner-emulator -p 9010:9010 gcr.io/cloud-spanner-emulator/emulator
```

**Common Solutions:**

**Port Conflict:**
```bash
# Use different port
export DOCKER_SPANNER_PORT=9020
make start

# Or kill process using port 9010
sudo lsof -ti:9010 | xargs kill -9  # macOS/Linux
```

**Docker Image Issues:**
```bash
# Pull latest image
docker pull gcr.io/cloud-spanner-emulator/emulator:latest

# Remove corrupted container
docker rm -f spanner-emulator

# Restart with fresh container
make start
```

### Emulator Connection Timeout

**Symptom:**
```
Error: failed to connect to emulator at localhost:9010
```

**Solution:**
```bash
# Increase timeout in Makefile (edit template/Makefile)
# Change: sleep 15
# To:     sleep 30

# Or wait longer manually
make start
sleep 30
make setup
```

### Docker Resource Issues

**Symptom:**
```
Error: insufficient resources to start container
```

**Solution:**
```bash
# Check Docker resource allocation
docker system df
docker system prune  # Clean up unused resources

# Increase Docker memory/CPU in Docker Desktop settings
# Restart Docker Desktop
```

## Database Setup Issues

### Schema Migration Failures

**Symptom:**
```
❌ Failed to apply: schema/001_users.sql
```

**Diagnostic Steps:**
```bash
# Check schema file syntax
cat schema/001_users.sql

# Test schema manually
SPANNER_PROJECT_ID=test-project \
SPANNER_INSTANCE_ID=test-instance \
SPANNER_DATABASE_ID=test-db \
SPANNER_EMULATOR_HOST=localhost:9010 \
wrench apply --ddl=schema/001_users.sql
```

**Common SQL Issues:**

**Missing Semicolons:**
```sql
-- ❌ Missing semicolon
CREATE TABLE Users (
  UserID STRING(36) NOT NULL
) PRIMARY KEY (UserID)

-- ✅ Correct
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
) PRIMARY KEY (UserID);
```

**Invalid Column Types:**
```sql
-- ❌ Invalid type
CREATE TABLE Users (
  UserID VARCHAR(36) NOT NULL,  -- Use STRING instead
) PRIMARY KEY (UserID);

-- ✅ Correct
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
) PRIMARY KEY (UserID);
```

**Primary Key Issues:**
```sql
-- ❌ Primary key not defined
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
);

-- ✅ Correct
CREATE TABLE Users (
  UserID STRING(36) NOT NULL,
) PRIMARY KEY (UserID);
```

### Database Creation Failures

**Symptom:**
```
❌ Database primary-db already exists or has been created
```

**Solution:**
```bash
# This is usually informational, not an error
# If you need to reset the database:

make stop
make clean
make start
make setup
```

### Seed Data Issues

**Symptom:**
```
❌ Failed to seed primary database
```

**Common Causes:**

**YAML Syntax Errors:**
```yaml
# ❌ Invalid YAML
Users:
- UserID: "user-123"
  Name: John Doe  # Missing quotes

# ✅ Correct YAML
- UserID: "user-123"
  Name: "John Doe"
```

**Data Type Mismatches:**
```yaml
# ❌ Incorrect types
- UserID: 123  # Should be string
  CreatedAt: "invalid-date"

# ✅ Correct types
- UserID: "user-123"
  CreatedAt: "2024-01-01T00:00:00Z"
```

**Missing Required Fields:**
```yaml
# ❌ Missing primary key
- Name: "John Doe"
  Email: "john@example.com"

# ✅ Include all required fields
- UserID: "user-123"
  Name: "John Doe"
  Email: "john@example.com"
```

## Testing Issues

### Playwright Installation Problems

**Symptom:**
```
Error: Playwright executable not found
```

**Solution:**
```bash
# Reinstall Playwright browsers
npx playwright install

# For specific browsers only
npx playwright install chromium firefox webkit

# Check installation
npx playwright --version
```

### Test Execution Failures

**Symptom:**
```
TimeoutError: page.goto: Timeout exceeded
```

**Solutions:**

**Increase Timeouts:**
```typescript
// In playwright.config.ts
export default defineConfig({
  timeout: 60000,  // Increase from default 30000
  expect: {
    timeout: 10000,  // Increase assertion timeout
  },
});
```

**Check Application Status:**
```bash
# Ensure your app is running
curl http://localhost:3000  # Or your app URL

# Check if URL is accessible
ping localhost
```

**Use Debugging Mode:**
```bash
# Run tests in headed mode
npx playwright test --headed

# Run with debug
npx playwright test --debug

# Run single test
npx playwright test --grep "specific test name"
```

### Database Validation Failures

**Symptom:**
```
❌ Database validation failed for scenario-01
```

**Diagnostic Steps:**
```bash
# Check expected state file
cat scenarios/scenario-01/expected-primary.yaml

# Run spalidate manually
SPANNER_EMULATOR_HOST=localhost:9010 \
spalidate --project test-project \
         --instance test-instance \
         --database primary-db \
         --verbose scenarios/scenario-01/expected-primary.yaml
```

**Common Validation Issues:**

**Row Count Mismatches:**
```yaml
# ❌ Too strict
tables:
  Users:
    row_count: 1  # Exactly 1 row

# ✅ More flexible
tables:
  Users:
    row_count_min: 1
    row_count_max: 10
```

**Column Type Issues:**
```yaml
# ❌ Incorrect type specification
tables:
  Users:
    columns:
      - name: UserID
        type: VARCHAR  # Spanner uses STRING

# ✅ Correct type
tables:
  Users:
    columns:
      - name: UserID
        type: STRING
```

## Performance Issues

### Slow Test Execution

**Symptom:**
```
Tests taking longer than expected
```

**Solutions:**

**Optimize Playwright Configuration:**
```typescript
// playwright.config.ts
export default defineConfig({
  workers: 1,  // Reduce for database tests
  fullyParallel: false,  // Prevent database conflicts
  retries: 0,  // Disable retries during development
});
```

**Reduce Browser Overhead:**
```typescript
// Run only one browser during development
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  // Comment out other browsers for faster execution
  // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

**Optimize Database Operations:**
```bash
# Use smaller datasets for development
# Create minimal fixtures for quick testing
```

### Memory Issues

**Symptom:**
```
Error: Cannot allocate memory
ENOMEM: not enough memory
```

**Solutions:**
```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Close other applications
# Monitor memory usage
docker stats

# Use fewer browser instances
# Reduce test parallelization
```

## Integration Issues

### CI/CD Failures

**Symptom:**
```
Tests pass locally but fail in CI
```

**Common Causes and Solutions:**

**Resource Limitations:**
```yaml
# .github/workflows/test.yml
- name: Install dependencies
  run: |
    npm ci
    # Increase timeout for slower CI environments
    export EMULATOR_TIMEOUT=60000
    make init
```

**Environment Differences:**
```bash
# Ensure consistent Node.js version
node --version  # Should match CI environment

# Check Docker availability in CI
docker --version
```

**Network Issues:**
```bash
# Use localhost instead of 127.0.0.1
SPANNER_EMULATOR_HOST=localhost:9010

# Check firewall/port restrictions
```

### Cross-Platform Issues

**Windows Specific:**

**Path Separators:**
```bash
# Use forward slashes or environment variables
PRIMARY_SCHEMA_PATH=./schema  # Not .\schema

# Use cross-platform commands in Makefile
```

**Line Endings:**
```bash
# Configure git to handle line endings
git config --global core.autocrlf true  # Windows
git config --global core.autocrlf input  # macOS/Linux
```

**PowerShell vs CMD:**
```bash
# Use bash or WSL for consistent experience
# Or adapt commands for PowerShell
```

## Getting Help

### Diagnostic Information

When reporting issues, include:

```bash
# System information
uname -a  # macOS/Linux
systeminfo  # Windows

# Version information
node --version
npm --version
docker --version
go version

# Spanwright configuration
cat .env
make validate

# Error logs
docker logs spanner-emulator
npm test 2>&1 | tee test.log
```

### Support Channels

- **GitHub Issues**: [Report bugs and request features](https://github.com/nu0ma/spanwright/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/nu0ma/spanwright/discussions)  
- **Documentation**: [Complete documentation](https://nu0ma.github.io/spanwright)

### Issue Template

When reporting issues:

```markdown
## Environment
- OS: [macOS/Linux/Windows]
- Node.js version: [x.x.x]
- Docker version: [x.x.x]
- Spanwright version: [x.x.x]

## Steps to Reproduce
1. Run command: `npx spanwright my-test`
2. Execute: `make init`
3. Error occurs during: `make start`

## Expected Behavior
Emulator should start successfully

## Actual Behavior
Container fails to start with error: [error message]

## Additional Context
- Logs: [attach relevant logs]
- Configuration: [.env content]
- Previous working version: [if applicable]
```

## Prevention Tips

### Best Practices

1. **Always validate configuration:**
   ```bash
   make validate
   ```

2. **Use version management:**
   ```bash
   mise install  # Or asdf install
   ```

3. **Keep tools updated:**
   ```bash
   npm update
   go install github.com/cloudspannerecosystem/wrench@latest
   ```

4. **Regular cleanup:**
   ```bash
   make clean
   docker system prune
   ```

5. **Test incrementally:**
   ```bash
   make test-scenario SCENARIO=simple-test
   ```

### Monitoring

```bash
# Monitor resource usage
docker stats

# Check disk space
df -h

# Monitor process performance
top -p $(pgrep -f spanner-emulator)
```

By following this troubleshooting guide, you should be able to resolve most common issues with Spanwright. If problems persist, don't hesitate to reach out to the community for support.