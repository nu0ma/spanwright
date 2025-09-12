# AGENTS.md

本リポジトリでエージェント（Claude Code/Serena/各種AIコーディング支援）が安全かつ一貫性をもって作業するための指針を示します。

## 目的と適用範囲
- 目的: 変更作業の一貫性・安全性・再現性の確保。
- 適用範囲: リポジトリ全体に適用。サブディレクトリに別の AGENTS.md がある場合は、より深い階層の記述が優先されます。
- 優先順位: ユーザー/メンテナの明示指示 >（該当ディレクトリの）AGENTS.md > 既存ドキュメント。

## 技術スタックと前提条件
- 言語/ツール: TypeScript（CLI ジェネレータ）+ Go（DB ツール）+ Playwright（E2E）。
- Node.js: `>= 24.0.0`（`package.json#engines`/`.tool-versions` を信頼）。
- パッケージマネージャ: `pnpm >= 10`（`preinstall` で強制）。
- 主要外部ツール（必要に応じて）: Docker, wrench（Spanner schema）, spalidate（DB検証）, Go（1.25.0 目安）。
- 実行環境: macOS/Linux（Docker デーモンが利用可能であること）。

## 日常オペレーション（最小セット）
- 初期化: `pnpm install`
- ビルド: `pnpm run build`
- テスト一括: `pnpm test`（unit + E2E）
- 単体/統合: `pnpm run test:unit` / `pnpm run test:e2e`
- 品質: `pnpm run lint` / `pnpm run format`
- ウォッチ: `pnpm run dev`

E2E は `e2e/run-e2e-test.sh` を経由します。Docker と Spanner エミュレータが必要です。

## 変更ポリシー
- 最小差分: 不要なリファクタや並行変更を避け、関連ファイルのみに限定。
- 既存スタイル尊重: 既存の型/関数名/配置に合わせる（破壊的変更は要合意）。
- ドキュメント同期: 仕様やコマンド変更時は README/CLAUDE.md も更新。
- 秘密情報: 機密値の追加は禁止（.env.sample 等の雛形で例示）。
- 依存追加: 目的・代替・影響範囲を PR で明記。

## コードスタイル（要点）
- TypeScript: ESLint/Prettier に準拠（`pnpm run lint`/`format` で最終整形）。
- Go: 標準的な `internal/` 構成と小さな関数、明確なエラー処理。
- テンプレート: 生成物のパス検証や入力バリデーションを必須とする（パストラバーサル禁止）。

## テスト方針
- 全体: PR 前に `pnpm test` を原則必須（CI と同等の体験を確保）。
- カバレッジ閾値は vitest 設定に準拠。E2E は変更に関係するシナリオのみでも可。
- テンプレート変更時: 実際に生成して最低限の `make init && make test` 相当を検証（可能な範囲で）。

## Git/PR ガイドライン
- ブランチ: `feat/*`, `fix/*`, `chore/*`, `docs/*` などの接頭辞を推奨。
- コミット: 要件に合わせ簡潔に（例: `chore: update agents guide`）。
- PR タイトル: 変更の要点を 50 文字以内で平叙文。
- PR 説明テンプレート（推奨）:
  - 目的/背景
  - 主要変更点（箇条書き）
  - 動作確認（使用コマンド/スクリーンショット/ログ）
  - 影響範囲/互換性/移行手順
  - チェックリスト（lint/format/test 済み、Docs 反映済み 等）

## 大きな変更の進め方
- 影響整理 → 小さな PR に分割 → インクリメンタルにマージ。
- 互換性破壊を伴う場合は deprecation 期間や移行ガイドを用意。

## Serena/Claude 連携メモ
- Serena: `.serena/` 配下の `project.yml` と `memories/*.md` にワークフロー/スタイル/コマンドの詳細があります。作業前に参照してください。
- Claude Code: 追加の手順や使用例は `CLAUDE.md` にまとまっています。README と差異がある場合は、`package.json#engines` と `.tool-versions` の値を優先し、必要に応じて両方を更新してください。

## 参考
- `.serena/memories/*`: 開発フロー、コードスタイル、タスクチェックリスト、ツール詳細。
- `CLAUDE.md`: ビルド/テスト/使い方の具体例とアーキテクチャ説明。
- `README.md`: 全体の機能紹介と利用手順（バージョンは最新の engines を基準に整合化）。

