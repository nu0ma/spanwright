# Version Management System - Manual Trigger Only

## User Requirement
User requested that automatic version updates should NOT run on a schedule (cron). The system should only be triggered manually via workflow_dispatch.

## Changes Made

### GitHub Actions Workflow: `update-versions.yml`

#### Removed Scheduled Trigger
**Before:**
```yaml
on:
  schedule:
    - cron: '0 10 * * MON'  # Weekly on Monday at 10:00 UTC
  workflow_dispatch:
```

**After:**
```yaml
on:
  workflow_dispatch:
```

#### Updated Workflow Steps
- Removed complex scheduled update logic that checked for Go/Node.js updates
- Simplified "Update all versions" step to only run from versions.json
- Updated PR descriptions to remove scheduled trigger references
- Updated commit messages to remove "scheduled" references

#### Manual Trigger Only
The workflow now only runs when:
- Manually triggered via GitHub Actions UI
- Called via GitHub API with workflow_dispatch
- Triggered by other workflows using workflow_call (if needed in future)

## Current Workflow Options

Users can manually trigger updates for:
1. **Runtime versions**: `go`, `node`, `pnpm` with specific version
2. **Dependencies**: Specific package with version and scope (`go`, `cli`, `template`)
3. **All versions**: Batch update all versions from `versions.json`

## Benefits of Manual-Only Approach

### Control
- Explicit control over when version updates happen
- No surprise automatic PRs during development cycles
- Better coordination with release schedules

### Reliability
- Updates happen when maintainers can review and test
- Reduced CI/CD noise from automated updates
- More predictable development workflow

### Flexibility
- Can batch multiple version updates together
- Can time updates with other maintenance tasks
- Can skip updates during critical periods

## Usage Instructions

### Via GitHub UI
1. Go to Actions → Update Versions
2. Click "Run workflow"
3. Select component type and provide version details
4. Click "Run workflow" to start

### Via GitHub CLI
```bash
gh workflow run update-versions.yml \
  --field component=go \
  --field version=1.24.6

gh workflow run update-versions.yml \
  --field component=dependencies \
  --field dependency_name=spanner \
  --field dependency_version=v1.83.0 \
  --field dependency_scope=go
```

This approach gives full control over version management while maintaining the automated validation and PR creation capabilities.