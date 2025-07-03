# Release Command

Interactive release management for the spanwright npm package.

## Usage

```bash
/release [type]
```

Where `type` can be:
- `patch` - Bug fixes (0.0.1 → 0.0.2)
- `minor` - New features (0.1.0 → 0.2.0)
- `major` - Breaking changes (1.0.0 → 2.0.0)
- `prerelease` - Pre-release version (0.1.0 → 0.1.1-alpha.1)

## Examples

```bash
/release patch        # Release patch version
/release minor        # Release minor version  
/release major        # Release major version
/release prerelease   # Release pre-release version
```

## What this command does

1. **Validation**: Runs template validation and E2E tests
2. **Changelog**: Generates changelog from git commits
3. **Version**: Updates package.json version
4. **Review**: Shows preview and asks for confirmation
5. **Release**: Creates git tag and pushes to trigger npm publish

## Alternative Methods

- **NPM Scripts**: `npm run release:patch|minor|major|prerelease`
- **GitHub Actions**: Use the "Manual Release" workflow in GitHub Actions
- **CLI**: Run `npx ts-node scripts/release.ts <type>`

## Options

- `--dry-run` - Preview changes without making them
- `--skip-validation` - Skip pre-release validation
- `--skip-push` - Don't push to git (manual push required)

## Implementation

When `/release` is invoked:

1. **Generate changelog preview**:
   ```bash
   npm run changelog
   ```

2. **Run the release script**:
   ```bash
   npm run release:{type}
   ```

3. **Show preview and ask for confirmation**

4. **If confirmed, the script will**:
   - Run pre-release validation
   - Update package.json version
   - Update CHANGELOG.md
   - Create git commit and tag
   - Push to GitHub
   - GitHub Actions will automatically publish to npm

5. **Provide feedback about the release status**