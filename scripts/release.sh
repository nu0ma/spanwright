#!/bin/bash

# Release automation script for spanwright
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Get release type from arguments
RELEASE_TYPE=${1:-patch}
DRY_RUN=false
SKIP_VALIDATION=false
SKIP_PUSH=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            ;;
        --skip-push)
            SKIP_PUSH=true
            ;;
    esac
done

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major|prerelease)$ ]]; then
    print_error "Invalid release type: $RELEASE_TYPE"
    echo "Usage: $0 <patch|minor|major|prerelease> [--dry-run] [--skip-validation] [--skip-push]"
    exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

# Calculate next version
calculate_next_version() {
    local current=$1
    local type=$2
    
    IFS='.' read -ra VERSION_PARTS <<< "$current"
    local major=${VERSION_PARTS[0]}
    local minor=${VERSION_PARTS[1]}
    local patch=${VERSION_PARTS[2]}
    
    case $type in
        major)
            echo "$((major + 1)).0.0"
            ;;
        minor)
            echo "$major.$((minor + 1)).0"
            ;;
        patch)
            echo "$major.$minor.$((patch + 1))"
            ;;
        prerelease)
            echo "$major.$minor.$((patch + 1))-alpha.1"
            ;;
    esac
}

NEW_VERSION=$(calculate_next_version "$CURRENT_VERSION" "$RELEASE_TYPE")

# Generate changelog
generate_changelog() {
    ./scripts/get-changes-since-tag.sh --version "$1" 2>/dev/null || echo "No changes since last tag."
}

# Run pre-release validation
run_validation() {
    print_info "🔍 Running pre-release validation..."
    
    # Check git status
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Git working directory is not clean. Please commit or stash changes."
        exit 1
    fi
    
    # Template validation
    print_info "  📝 Validating templates..."
    if npm run template:validate > /dev/null 2>&1; then
        print_success "Template validation passed"
    else
        print_error "Template validation failed"
        exit 1
    fi
    
    # Build
    print_info "  🔨 Building project..."
    if npm run build > /dev/null 2>&1; then
        print_success "Build successful"
    else
        print_error "Build failed"
        exit 1
    fi
    
    # Tests
    print_info "  🧪 Running tests..."
    if npm test > /dev/null 2>&1; then
        print_success "Tests passed"
    else
        print_warning "Tests failed, but continuing"
    fi
}

# Main release process
print_info "🚀 Starting $RELEASE_TYPE release..."
echo
print_info "📋 Release Preview:"
echo "  Current version: $CURRENT_VERSION"
echo "  New version: $NEW_VERSION"
echo
print_info "📝 Changelog preview:"
generate_changelog "$NEW_VERSION"
echo

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    print_info "🏃 Dry run mode - no changes will be made"
    exit 0
fi

# Confirm release
read -p "Continue with release? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Release cancelled"
    exit 1
fi

# Run validation
if [ "$SKIP_VALIDATION" = false ]; then
    run_validation
fi

# Update package.json version
print_info "📦 Updating version to $NEW_VERSION..."
npm version "$NEW_VERSION" --no-git-tag-version

# Update CHANGELOG.md
print_info "📝 Updating CHANGELOG.md..."
./scripts/get-changes-since-tag.sh --version "$NEW_VERSION" > new-changelog-section.md

# Create a temporary file for the new changelog
if [ -f CHANGELOG.md ]; then
    # Extract header (first 7 lines)
    head -n 7 CHANGELOG.md > CHANGELOG.new.md
    echo "" >> CHANGELOG.new.md
    
    # Add new changelog section
    cat new-changelog-section.md >> CHANGELOG.new.md
    echo "" >> CHANGELOG.new.md
    
    # Add rest of the old changelog (skip header)
    tail -n +8 CHANGELOG.md >> CHANGELOG.new.md
    
    # Replace old changelog
    mv CHANGELOG.new.md CHANGELOG.md
else
    # Create new changelog
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    cat new-changelog-section.md >> CHANGELOG.md
fi

# Cleanup
rm -f new-changelog-section.md

# Git operations
print_info "🏷️  Creating git tag v$NEW_VERSION..."
git add package.json CHANGELOG.md
git commit -m "chore: release $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION"

# Push to remote
if [ "$SKIP_PUSH" = false ]; then
    print_info "🚀 Pushing release to origin..."
    git push origin main
    git push origin --tags
else
    print_warning "Skipping push to remote (--skip-push flag)"
fi

echo
print_success "Release $NEW_VERSION completed successfully!"
print_info "🎉 GitHub Actions will automatically publish to npm when the tag is pushed."

if [ "$SKIP_PUSH" = true ]; then
    print_warning "Don't forget to push the tag: git push origin --tags"
fi