/**
 * Semantic Release Configuration
 *
 * This configuration follows OSS best practices used by popular projects
 * like React, Vue, Angular, and TypeScript.
 */

module.exports = {
  branches: ['main'],
  plugins: [
    // Analyze commits to determine the type of release
    '@semantic-release/commit-analyzer',

    // Generate release notes based on commits
    '@semantic-release/release-notes-generator',

    // Update CHANGELOG.md with release notes
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      },
    ],

    // Update package.json version
    '@semantic-release/npm',

    // Create a GitHub release
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'dist/**',
            label: 'Distribution files',
          },
        ],
      },
    ],

    // Commit updated files back to the repository
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
