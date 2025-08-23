#!/bin/bash

# Complete automated E2E test script
# Tests actual CLI by creating a real Spanwright project and running E2E tests

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_PROJECT_NAME="ci-test-project"
TEST_PROJECT_PATH="$PROJECT_ROOT/$TEST_PROJECT_NAME"
TEMP_SCHEMA_BASE="/tmp/ci-schemas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}✅ [$(date -Iseconds)] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️ [$(date -Iseconds)] $1${NC}"
}

log_error() {
    echo -e "${RED}❌ [$(date -Iseconds)] $1${NC}"
}

# Track start time
START_TIME=$(date +%s)

get_elapsed_time() {
    local end_time=$(date +%s)
    local elapsed=$((end_time - START_TIME))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo "${minutes}m${seconds}s"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! docker version > /dev/null 2>&1; then
        log_error "Docker is not available. Please ensure Docker Desktop is installed and running."
        exit 1
    fi
    log_info "Docker environment check completed"
    
    # Check wrench
    if ! command -v wrench > /dev/null 2>&1; then
        log_error "wrench not found. Install with: go install github.com/cloudspannerecosystem/wrench@latest"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node > /dev/null 2>&1; then
        log_error "Node.js not found"
        exit 1
    fi
    
    log_info "Prerequisites check completed"
}

# Setup CI schemas
setup_ci_schemas() {
    log_info "Setting up CI schemas..."
    
    cd "$PROJECT_ROOT"
    
    # Capture the environment variables from the schema setup
    local setup_output
    setup_output=$(npx ts-node scripts/setup-e2e-test-schemas.ts 2>&1)
    local setup_exit_code=$?
    
    # Print the output so we can see what happened
    echo "$setup_output"
    
    if [ $setup_exit_code -ne 0 ]; then
        log_error "CI schema setup failed"
        exit 1
    fi
    
    # Parse the environment variables from the output
    # Extract schema paths from the output
    export SPANWRIGHT_PRIMARY_SCHEMA_PATH=$(echo "$setup_output" | grep "export SPANWRIGHT_PRIMARY_SCHEMA_PATH=" | cut -d'=' -f2-)
    export SPANWRIGHT_SECONDARY_SCHEMA_PATH=$(echo "$setup_output" | grep "export SPANWRIGHT_SECONDARY_SCHEMA_PATH=" | cut -d'=' -f2-)
    
    # Validate that we got the paths
    if [ -z "$SPANWRIGHT_PRIMARY_SCHEMA_PATH" ] || [ -z "$SPANWRIGHT_SECONDARY_SCHEMA_PATH" ]; then
        log_error "Failed to extract schema paths from setup output"
        exit 1
    fi
    
    log_info "CI schemas setup completed"
}

# Create project using actual CLI
create_project_with_cli() {
    log_info "Creating project with actual CLI..."
    
    # Clean up existing test project
    if [ -d "$TEST_PROJECT_PATH" ]; then
        rm -rf "$TEST_PROJECT_PATH"
    fi
    
    # Build CLI first
    log_info "Building CLI..."
    cd "$PROJECT_ROOT"
    if ! pnpm run build; then
        log_error "CLI build failed"
        exit 1
    fi
    
    # Set environment variables for non-interactive mode
    export SPANWRIGHT_DB_COUNT=2
    export SPANWRIGHT_PRIMARY_DB_NAME=ci-primary-db
    # SPANWRIGHT_PRIMARY_SCHEMA_PATH and SPANWRIGHT_SECONDARY_SCHEMA_PATH are already set by setup_ci_schemas
    export SPANWRIGHT_SECONDARY_DB_NAME=ci-secondary-db
    export CI=true
    
    # Run actual CLI
    log_info "Running actual CLI..."
    if ! node dist/index.js "$TEST_PROJECT_NAME"; then
        log_error "CLI execution failed"
        exit 1
    fi
    
    # Verify project was created
    if [ ! -d "$TEST_PROJECT_PATH" ]; then
        log_error "Project directory was not created: $TEST_PROJECT_PATH"
        exit 1
    fi
    
    log_info "Project created successfully with actual CLI"
}

# Initialize the generated project
initialize_project() {
    log_info "Initializing generated project..."
    
    cd "$TEST_PROJECT_PATH"
    if ! make init; then
        log_error "Project initialization failed"
        exit 1
    fi
    
    log_info "Project initialization completed"
}

# Test make commands in generated project
test_make_commands() {
    log_info "Testing make commands in generated project..."
    
    cd "$TEST_PROJECT_PATH"
    
    # Test help command
    if ! make help > /dev/null 2>&1; then
        log_warn "Make help command failed, but continuing..."
    fi
    
    # Test start command (includes tool checking)
    if ! make start; then
        log_error "Make start failed"
        exit 1
    fi
    
    log_info "Make commands test completed"
}

# Run full E2E scenarios
run_full_e2e_tests() {
    log_info "Running full E2E test pipeline..."
    
    cd "$TEST_PROJECT_PATH"
    
    # Run all scenarios - this includes emulator setup, schema creation, seeding, and Playwright tests
    if ! make test; then
        log_error "E2E pipeline failed"
        # Skip interactive report generation in CI environment
        if [ -z "$CI" ]; then
            log_warn "E2E tests failed, attempting to generate report..."
            npx playwright show-report || true
        else
            log_warn "E2E tests failed (skipping interactive report in CI environment)"
        fi
        exit 1
    fi
    
    log_info "Full E2E test pipeline completed successfully"
}

# Cleanup
cleanup() {
    log_info "Running cleanup..."
    
    # Stop Spanner emulator if project exists
    if [ -d "$TEST_PROJECT_PATH" ]; then
        cd "$TEST_PROJECT_PATH"
        make stop || true
    fi
    
    # Clean up temporary schemas
    if [ -d "$TEMP_SCHEMA_BASE" ]; then
        rm -rf "$TEMP_SCHEMA_BASE"
        log_info "Temporary schemas cleaned up"
    fi
    
    # Clean up test project
    if [ -d "$TEST_PROJECT_PATH" ]; then
        rm -rf "$TEST_PROJECT_PATH"
        log_info "Test project cleaned up"
    fi
    
    log_info "Cleanup completed"
}

# Show test results summary
show_summary() {
    local success=$1
    local error_msg=$2
    local elapsed_time=$(get_elapsed_time)
    
    echo "======================================================================"
    log_info "Real CLI E2E Test Results Summary"
    echo "======================================================================"
    log_info "Execution time: $elapsed_time"
    
    if [ "$success" = "true" ]; then
        log_info "Real CLI E2E tests completed successfully!"
        echo ""
        log_info "✅ Verified:"
        log_info "  - Actual CLI project generation"
        log_info "  - Template file integrity"
        log_info "  - Go module compilation"
        log_info "  - Spanner emulator integration"
        log_info "  - Database schema setup"
        log_info "  - Playwright browser tests"
        echo ""
        log_info "Generated files:"
        log_info "  - Test project: $TEST_PROJECT_PATH"
        log_info "  - Test results: $TEST_PROJECT_PATH/test-results/"
    else
        log_error "Real CLI E2E test failed"
        if [ -n "$error_msg" ]; then
            log_error "Error details: $error_msg"
        fi
        echo ""
        log_info "Troubleshooting:"
        log_info "  1. Ensure Docker Desktop is running"
        log_info "  2. Ensure wrench is installed"
        log_info "  3. Ensure ports 9010, 9020 are not in use"
        log_info "  4. Check schema files in /tmp/ci-schemas/"
        echo ""
        log_info "Manual testing:"
        log_info "  npx ts-node scripts/setup-ci-schemas.ts"
        log_info "  # Set environment variables"
        log_info "  npx spanwright test-project"
        log_info "  cd test-project && make init && make run-all-scenarios"
    fi
    
    echo "======================================================================"
}

# Main execution function
main() {
    log_info "Starting real CLI E2E test execution..."
    
    local success="false"
    local error_msg=""
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    if check_prerequisites && \
       setup_ci_schemas && \
       create_project_with_cli && \
       initialize_project && \
       test_make_commands && \
       run_full_e2e_tests; then
        success="true"
    else
        error_msg="One or more test steps failed"
    fi
    
    show_summary "$success" "$error_msg"
    
    if [ "$success" = "true" ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi