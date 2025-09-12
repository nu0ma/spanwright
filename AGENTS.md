# AGENTS.md

Guidelines to help agents (Claude Code / Serena / other AI coding assistants) work safely and consistently in this repository.

## Purpose & Scope
- Purpose: Ensure consistency, safety, and reproducibility of changes.
- Scope: Applies to the entire repository. If an AGENTS.md exists in a subdirectory, the deeper file takes precedence for that subtree.
- Priority: Explicit instructions from the user/maintainer > AGENTS.md for the relevant directory > existing docs.

## Tech Stack & Prerequisites
- Languages/Tools: TypeScript (CLI generator) + Go (DB tooling) + Playwright (E2E).
- Node.js: `>= 24.0.0` (trust `package.json#engines` and `.tool-versions`).
- Package manager: `pnpm >= 10` (enforced via `preinstall`).
- Key external tools (as needed): Docker, wrench (Spanner schema), spalidate (DB validation), Go (around 1.25.0).
- Runtime environment: macOS/Linux with a working Docker daemon.

## Daily Operations (Minimum Set)
- Init: `pnpm install`
- Build: `pnpm run build`
- All tests: `pnpm test` (unit + E2E)
- Unit/Integration: `pnpm run test:unit` / `pnpm run test:e2e`
- Quality: `pnpm run lint` / `pnpm run format`
- Watch: `pnpm run dev`

E2E tests run via `e2e/run-e2e-test.sh`. Docker and the Spanner emulator are required.

## Change Policy
- Minimal diffs: Avoid unnecessary refactors or parallel changes; limit modifications to related files only.
- Respect existing style: Follow existing types/function names/file layout (breaking changes require prior agreement).
- Docs in sync: When specs or commands change, update README/CLAUDE.md as well.
- Secrets: Do not add sensitive values (use templates like `.env.sample` for examples).
- Adding dependencies: In PRs, state purpose, alternatives, and impact clearly.

## Code Style (Key Points)
- TypeScript: Conform to ESLint/Prettier (`pnpm run lint` / `pnpm run format`).
- Go: Use conventional `internal/` layout, small functions, and clear error handling.
- Templates: Must perform path validation and input validation; path traversal is prohibited.

## Testing Policy
- General: Run `pnpm test` locally before PRs to mirror CI.
- Coverage thresholds follow the vitest configuration. E2E may be limited to affected scenarios.
- When templates change: Generate artifacts and verify at least an equivalent of `make init && make test` where feasible.

## Git/PR Guidelines
- Branches: Prefer prefixes like `feat/*`, `fix/*`, `chore/*`, `docs/*`.
- Commits: Keep concise and aligned to scope (e.g., `chore: update agents guide`).
- PR title: Plain sentence within 50 characters.
- Suggested PR description template:
  - Purpose/Background
  - Key changes (bulleted)
  - Verification (commands/screenshots/logs)
  - Impact/Compatibility/Migration steps
  - Checklist (lint/format/test done, Docs updated, etc.)

## Handling Large Changes
- Analyze impact → split into small PRs → merge incrementally.
- For breaking changes, provide a deprecation period and a migration guide.

## Serena/Claude Notes
- Serena: See `.serena/project.yml` and `.serena/memories/*.md` for workflow/style/commands. Review before starting work.
- Claude Code: Additional steps and examples are in `CLAUDE.md`. If it differs from README, prefer values in `package.json#engines` and `.tool-versions`; update both as needed.

## References
- `.serena/memories/*`: Development flow, code style, task checklists, tool details.
- `CLAUDE.md`: Build/test/usage examples and architecture overview.
- `README.md`: Overall features and usage. Ensure versions align with the latest `engines` configuration.

