# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0](https://github.com/nu0ma/spanwright/compare/v2.2.5...v2.3.0) (2025-07-15)


### Features

* migrate from semantic-release to release-please ([#99](https://github.com/nu0ma/spanwright/issues/99)) ([00a1f49](https://github.com/nu0ma/spanwright/commit/00a1f49b6824f0c8ce9cd6e30f065e07bb89b9e2))


### Bug Fixes

* add pull-requests write permission to release workflow ([b2c40ef](https://github.com/nu0ma/spanwright/commit/b2c40ef0ea8199297bb1d486947b978c9db5cf65))
* release flow ([#101](https://github.com/nu0ma/spanwright/issues/101)) ([8229ab3](https://github.com/nu0ma/spanwright/commit/8229ab3aa6e926260be90a9bada6ca13b55e7947))
* simplify release flow ([#98](https://github.com/nu0ma/spanwright/issues/98)) ([6c7bf39](https://github.com/nu0ma/spanwright/commit/6c7bf391fa257dc75867c8c4d71e48fec25de188))
* use pat ([#103](https://github.com/nu0ma/spanwright/issues/103)) ([15da180](https://github.com/nu0ma/spanwright/commit/15da18011e59c27c31d2933c4238639f09a47032))

## [2.2.5](https://github.com/nu0ma/spanwright/compare/v2.2.4...v2.2.5) (2025-07-15)


### Bug Fixes

* correct scenario directory name in validation tests ([#97](https://github.com/nu0ma/spanwright/issues/97)) ([d522b5e](https://github.com/nu0ma/spanwright/commit/d522b5ece8995bc67a6c72388b9f5ae8a4cd0760))

## [2.2.4](https://github.com/nu0ma/spanwright/compare/v2.2.3...v2.2.4) (2025-07-14)


### Bug Fixes

* node version ([a62cb8c](https://github.com/nu0ma/spanwright/commit/a62cb8c1e1021ca0200446d253c22dcddf8c3f46))

## [2.2.3](https://github.com/nu0ma/spanwright/compare/v2.2.2...v2.2.3) (2025-07-13)


### Bug Fixes

* rename validateDatabaseState ([#94](https://github.com/nu0ma/spanwright/issues/94)) ([3e961ce](https://github.com/nu0ma/spanwright/commit/3e961cec5548d8497983fdcecafefdd1a7bc97e6))

## [2.2.2](https://github.com/nu0ma/spanwright/compare/v2.2.1...v2.2.2) (2025-07-13)


### Bug Fixes

* remove release command ([#93](https://github.com/nu0ma/spanwright/issues/93)) ([3aeca1f](https://github.com/nu0ma/spanwright/commit/3aeca1f1fcb064b8f790458bea82e37f9de3d991))

## [2.2.1](https://github.com/nu0ma/spanwright/compare/v2.2.0...v2.2.1) (2025-07-13)


### Bug Fixes

* prevent unwanted directory creation with absolute schema paths ([#79](https://github.com/nu0ma/spanwright/issues/79)) ([54f1bf5](https://github.com/nu0ma/spanwright/commit/54f1bf5c62b792c1d419046586bc4df1a660a7c7))

# [2.2.0](https://github.com/nu0ma/spanwright/compare/v2.1.0...v2.2.0) (2025-07-12)


### Features

* allow absolute paths for schema configuration ([#75](https://github.com/nu0ma/spanwright/issues/75)) ([5b3812c](https://github.com/nu0ma/spanwright/commit/5b3812c5cc51b33c9d4316e809a6aea691676d23))

# [2.1.0](https://github.com/nu0ma/spanwright/compare/v2.0.1...v2.1.0) (2025-07-12)


### Features

* add folder mode support for schema files ([#73](https://github.com/nu0ma/spanwright/issues/73)) ([83043ee](https://github.com/nu0ma/spanwright/commit/83043ee0f81cb488fc8c7fec3ffdc97474d5385e))

## [2.0.1](https://github.com/nu0ma/spanwright/compare/v2.0.0...v2.0.1) (2025-07-11)


### Bug Fixes

* resolve command injection vulnerability in Go database tools ([24cc979](https://github.com/nu0ma/spanwright/commit/24cc979f087760d97abd8c3d48df41c3d407d679)), closes [#59](https://github.com/nu0ma/spanwright/issues/59)
* resolve template processing code injection vulnerability ([ed8c7e2](https://github.com/nu0ma/spanwright/commit/ed8c7e21a8793a061f261f412cc657a61226e5ad)), closes [nu0ma/spanwright#57](https://github.com/nu0ma/spanwright/issues/57)
* resolve temporary file race condition vulnerability ([a9bf0fd](https://github.com/nu0ma/spanwright/commit/a9bf0fdd14fb81b6dee57ca21dc9765ca8f90e4e)), closes [#62](https://github.com/nu0ma/spanwright/issues/62)

# [2.0.0](https://github.com/nu0ma/spanwright/compare/v1.4.0...v2.0.0) (2025-07-09)


* 🔒 Fix critical path traversal vulnerability (Issue #56) (#63) ([49df3ee](https://github.com/nu0ma/spanwright/commit/49df3ee086de4b5232b2cc5f3cb95080722d25a1)), closes [#56](https://github.com/nu0ma/spanwright/issues/56) [#63](https://github.com/nu0ma/spanwright/issues/63) [#56](https://github.com/nu0ma/spanwright/issues/56) [#56](https://github.com/nu0ma/spanwright/issues/56)


### BREAKING CHANGES

* Project names containing `..`, null bytes, or starting
with `.` are now rejected for security reasons.

* fix

* fix: resolve unit test failures in security validation

- Reorder validation checks in validateProjectName to fix path traversal detection
- Add null byte validation for ensureDirectoryExists and writeFileContent
- Add targeted security checks for dangerous absolute paths in readFileContent
- Fix copyDirectory to validate path traversal in file names during copy operations
- Preserve SecurityError exceptions in error handling

All 247 unit tests now pass.

# [1.4.0](https://github.com/nu0ma/spanwright/compare/v1.3.0...v1.4.0) (2025-07-09)


### Features

* implement real spalidate validation in two-databases example ([#55](https://github.com/nu0ma/spanwright/issues/55)) ([12f52ae](https://github.com/nu0ma/spanwright/commit/12f52aead8e6d0139655902a6b78a857134ef147))

# [1.3.0](https://github.com/nu0ma/spanwright/compare/v1.2.1...v1.3.0) (2025-07-08)


### Features

* enforce emulator-only connections to prevent production accidents ([#52](https://github.com/nu0ma/spanwright/issues/52)) ([635c1fe](https://github.com/nu0ma/spanwright/commit/635c1fef88c2e19d38981734125609e6ca774d12))

## [1.2.1](https://github.com/nu0ma/spanwright/compare/v1.2.0...v1.2.1) (2025-07-08)


### Bug Fixes

* add retry loop for schema path validation ([#30](https://github.com/nu0ma/spanwright/issues/30)) ([ad974b6](https://github.com/nu0ma/spanwright/commit/ad974b6e626aff553db7771184eba75345d1fbc9))

# [1.2.0](https://github.com/nu0ma/spanwright/compare/v1.1.0...v1.2.0) (2025-07-08)


### Features

* add verbose flag to spalidate for better validation debugging ([#29](https://github.com/nu0ma/spanwright/issues/29)) ([2e631ed](https://github.com/nu0ma/spanwright/commit/2e631edfe58d216529de719bfb9f68559faf54a5))

# [1.1.0](https://github.com/nu0ma/spanwright/compare/v1.0.2...v1.1.0) (2025-07-08)


### Bug Fixes

* add spalidate installation to semantic-release workflow ([#27](https://github.com/nu0ma/spanwright/issues/27)) ([23f16d3](https://github.com/nu0ma/spanwright/commit/23f16d34a4ed79257589450843f94852dc134f84))


### Features

* use spalidate for db records validation ([#24](https://github.com/nu0ma/spanwright/issues/24)) ([75e638a](https://github.com/nu0ma/spanwright/commit/75e638ae70af7aa55146c531336f70a24bae6e6c))

## [1.0.2](https://github.com/nu0ma/spanwright/compare/v1.0.1...v1.0.2) (2025-07-08)


### Bug Fixes

* update fixture files for two-databases example ([#22](https://github.com/nu0ma/spanwright/issues/22)) ([6b6d3b0](https://github.com/nu0ma/spanwright/commit/6b6d3b0c2febc6e95008811f8ef8f7fb9614388b))

## [1.0.1](https://github.com/nu0ma/spanwright/compare/v1.0.0...v1.0.1) (2025-07-07)


### Bug Fixes

* resolve Docker container conflict in run-all-scenarios ([#18](https://github.com/nu0ma/spanwright/issues/18)) ([5c2f78a](https://github.com/nu0ma/spanwright/commit/5c2f78a56e755994b92a0d5ac671fb6e32dd2ee9))

# [1.0.0](https://github.com/nu0ma/spanwright/compare/v0.0.9...v1.0.0) (2025-07-07)


### Features

* migrate CI from hardcoded Go versions to tool version management ([#15](https://github.com/nu0ma/spanwright/issues/15)) ([1612373](https://github.com/nu0ma/spanwright/commit/1612373e6c2f77ec240c17b24f392dc892cc2a0d))
* migrate to semantic-release for automated versioning ([#16](https://github.com/nu0ma/spanwright/issues/16)) ([38a6406](https://github.com/nu0ma/spanwright/commit/38a6406c8a31703bb3bfddc012baf9e59df1f337))


### BREAKING CHANGES

* Manual release process has been replaced with semantic-release.
Use conventional commit messages for automated version management.

* fix: update lock file

* fix: update CI to work with semantic-release by using npm install instead of npm pack

No changes since last tag.


## [0.0.9] - 2025-07-03

### 🔧 Chores
- remove: delete redundant .env.example files from template and examples (#3) ([#3](https://github.com/nu0ma/spanwright/pull/3)) ([be01943](https://github.com/nu0ma/spanwright/commit/be01943))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Simpl](https://github.com/nu0ma/spanwright/commit/- Simpl))
-  ([- Remov](https://github.com/nu0ma/spanwright/commit/- Remov))
-  ([The .en](https://github.com/nu0ma/spanwright/commit/The .en))
- Ryota Ishikawa ([generat](https://github.com/nu0ma/spanwright/commit/generat))
- 0.0.8 ([09b5800](https://github.com/nu0ma/spanwright/commit/09b5800))



## [0.0.8] - 2025-07-03

### ✨ Features
- feat: add examples system with auto-update mechanism (#2) ([#2](https://github.com/nu0ma/spanwright/pull/2)) ([8373561](https://github.com/nu0ma/spanwright/commit/8373561))

### 🐛 Bug Fixes
- fix: update make init message to guide users to create new scenario (#1) ([#1](https://github.com/nu0ma/spanwright/pull/1)) ([420051c](https://github.com/nu0ma/spanwright/commit/420051c))

### 🔧 Chores
- chore: release 0.0.7 ([3407083](https://github.com/nu0ma/spanwright/commit/3407083))
- 0.0.7 ([65d37cf](https://github.com/nu0ma/spanwright/commit/65d37cf))
-  ([- Creat](https://github.com/nu0ma/spanwright/commit/- Creat))
-  ([- Add s](https://github.com/nu0ma/spanwright/commit/- Add s))
-  ([- Add t](https://github.com/nu0ma/spanwright/commit/- Add t))
-  ([- Imple](https://github.com/nu0ma/spanwright/commit/- Imple))
-  ([- Integ](https://github.com/nu0ma/spanwright/commit/- Integ))
-  ([- Add D](https://github.com/nu0ma/spanwright/commit/- Add D))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([The exa](https://github.com/nu0ma/spanwright/commit/The exa))
-  ([updated](https://github.com/nu0ma/spanwright/commit/updated))
-  ([* refac](https://github.com/nu0ma/spanwright/commit/* refac))
-  ([- Renam](https://github.com/nu0ma/spanwright/commit/- Renam))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Fix .](https://github.com/nu0ma/spanwright/commit/- Fix .))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Impro](https://github.com/nu0ma/spanwright/commit/- Impro))
- Ryota Ishikawa ([The new](https://github.com/nu0ma/spanwright/commit/The new))



## [0.0.7] - 2025-07-03

### ✨ Features
- feat: add examples system with auto-update mechanism (#2) ([#2](https://github.com/nu0ma/spanwright/pull/2)) ([8373561](https://github.com/nu0ma/spanwright/commit/8373561))

### 🐛 Bug Fixes
- fix: update make init message to guide users to create new scenario (#1) ([#1](https://github.com/nu0ma/spanwright/pull/1)) ([420051c](https://github.com/nu0ma/spanwright/commit/420051c))

### 🔧 Chores
- 0.0.7 ([65d37cf](https://github.com/nu0ma/spanwright/commit/65d37cf))
-  ([- Creat](https://github.com/nu0ma/spanwright/commit/- Creat))
-  ([- Add s](https://github.com/nu0ma/spanwright/commit/- Add s))
-  ([- Add t](https://github.com/nu0ma/spanwright/commit/- Add t))
-  ([- Imple](https://github.com/nu0ma/spanwright/commit/- Imple))
-  ([- Integ](https://github.com/nu0ma/spanwright/commit/- Integ))
-  ([- Add D](https://github.com/nu0ma/spanwright/commit/- Add D))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([The exa](https://github.com/nu0ma/spanwright/commit/The exa))
-  ([updated](https://github.com/nu0ma/spanwright/commit/updated))
-  ([* refac](https://github.com/nu0ma/spanwright/commit/* refac))
-  ([- Renam](https://github.com/nu0ma/spanwright/commit/- Renam))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Fix .](https://github.com/nu0ma/spanwright/commit/- Fix .))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Impro](https://github.com/nu0ma/spanwright/commit/- Impro))
- Ryota Ishikawa ([The new](https://github.com/nu0ma/spanwright/commit/The new))



## [0.0.6] - 2025-07-03

### 🐛 Bug Fixes
- fix: add go mod tidy prerequisite to fix missing go.sum errors ([f381608](https://github.com/nu0ma/spanwright/commit/f381608))

### 🔧 Chores
-  ([- Make ](https://github.com/nu0ma/spanwright/commit/- Make ))
-  ([- Fixes](https://github.com/nu0ma/spanwright/commit/- Fixes))
-  ([- Maint](https://github.com/nu0ma/spanwright/commit/- Maint))
- Convert all Japanese text to English across the project ([0d38e02](https://github.com/nu0ma/spanwright/commit/0d38e02))
-  ([- Conve](https://github.com/nu0ma/spanwright/commit/- Conve))
-  ([- Updat](https://github.com/nu0ma/spanwright/commit/- Updat))
-  ([- Ensur](https://github.com/nu0ma/spanwright/commit/- Ensur))
-  ([Affects](https://github.com/nu0ma/spanwright/commit/Affects))
-  ([- templ](https://github.com/nu0ma/spanwright/commit/- templ))
-  ([- templ](https://github.com/nu0ma/spanwright/commit/- templ))
-  ([- templ](https://github.com/nu0ma/spanwright/commit/- templ))
-  ([- templ](https://github.com/nu0ma/spanwright/commit/- templ))
-  ([- templ](https://github.com/nu0ma/spanwright/commit/- templ))
-  ([All tem](https://github.com/nu0ma/spanwright/commit/All tem))
- chore: version 0.0.5 ([af40feb](https://github.com/nu0ma/spanwright/commit/af40feb))



## [0.0.5] - 2025-07-03

### 🔧 Chores
- refactor: improve code architecture with modular design ([4f1c824](https://github.com/nu0ma/spanwright/commit/4f1c824))
-  ([- Extra](https://github.com/nu0ma/spanwright/commit/- Extra))
-  ([- Add c](https://github.com/nu0ma/spanwright/commit/- Add c))
-  ([- Imple](https://github.com/nu0ma/spanwright/commit/- Imple))
-  ([- Impro](https://github.com/nu0ma/spanwright/commit/- Impro))
-  ([- Reduc](https://github.com/nu0ma/spanwright/commit/- Reduc))
-  ([- Maint](https://github.com/nu0ma/spanwright/commit/- Maint))
-  ([- Pass ](https://github.com/nu0ma/spanwright/commit/- Pass ))
-  ([Modules](https://github.com/nu0ma/spanwright/commit/Modules))
-  ([- const](https://github.com/nu0ma/spanwright/commit/- const))
-  ([- error](https://github.com/nu0ma/spanwright/commit/- error))
-  ([- valid](https://github.com/nu0ma/spanwright/commit/- valid))
-  ([- cli.t](https://github.com/nu0ma/spanwright/commit/- cli.t))
-  ([- file-](https://github.com/nu0ma/spanwright/commit/- file-))
-  ([- confi](https://github.com/nu0ma/spanwright/commit/- confi))
-  ([Benefit](https://github.com/nu0ma/spanwright/commit/Benefit))
-  ([- Bette](https://github.com/nu0ma/spanwright/commit/- Bette))
-  ([- Robus](https://github.com/nu0ma/spanwright/commit/- Robus))
-  ([- Clean](https://github.com/nu0ma/spanwright/commit/- Clean))
-  ([- Produ](https://github.com/nu0ma/spanwright/commit/- Produ))



## [0.0.3] - 2025-07-03

### ✨ Features
- feat: add automated npm release workflow with changelog generation ([41fcd86](https://github.com/nu0ma/spanwright/commit/41fcd86))

### 🐛 Bug Fixes
- fix: escape regex special characters in changelog generation script ([8a2c10b](https://github.com/nu0ma/spanwright/commit/8a2c10b))


## [Unreleased]

### Added
- Initial open-source release preparation
- Contributing guidelines and community documentation
- Security policy and code of conduct
- GitHub issue and pull request templates

### Changed
- Enhanced documentation for community contribution
- Improved security practices for public repository

### Security
- Removed sensitive data from repository
- Enhanced .gitignore for development testbed protection

## [0.0.1] - 2024-12-XX

### Added
- Initial CLI tool for generating Cloud Spanner E2E testing frameworks
- Interactive project setup with database configuration
- Template system for Go tools and Playwright tests
- Development testbed for template validation
- Support for single and dual database configurations
- Docker-based Spanner emulator integration
- Make-based workflow automation
- Scenario-based testing framework
- Shared database configuration for parallel test execution
- Comprehensive validation tools for templates
- E2E testing pipeline with browser automation

### Features
- **CLI Generator**: Interactive project creation with `npx spanwright`
- **Go Database Tools**: High-performance validation and seeding tools
- **Playwright Integration**: Browser automation with database validation
- **Template Validation**: Automated syntax checking for Go, TypeScript, and YAML
- **Development Workflows**: Complete Make-based automation
- **Flexible Configuration**: Support for 1-2 Spanner databases
- **Docker Integration**: Automated emulator management
- **Scenario Testing**: Structured test data and validation

### Prerequisites
- Node.js >= 22.0.0
- Docker for Spanner emulator
- wrench for schema migrations
- Go for generated project tools

### Known Issues
- Template validation requires all prerequisites to be installed
- Development testbed creates temporary files that need cleanup
- Some template paths are hardcoded for development setup

---

## Release Notes

### Version 0.0.1
This is the initial release of Spanwright, a project generator for Cloud Spanner E2E testing frameworks. The tool provides:

- **Complete Project Generation**: Creates ready-to-use testing frameworks with Go tools and Playwright integration
- **Database Flexibility**: Supports both single and dual database configurations
- **Testing Infrastructure**: Includes scenario-based testing with data isolation
- **Development Tools**: Comprehensive validation and development workflows
- **Docker Integration**: Automated Spanner emulator management

The generated projects include:
- Go-based database validation and seeding tools
- Playwright browser automation tests
- Make-based workflow automation
- Scenario-based test organization
- Shared database approach for parallel execution

For usage instructions, see the [README](README.md).
For contributing guidelines, see [CONTRIBUTING](CONTRIBUTING.md).
