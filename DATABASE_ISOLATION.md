# データベース分離メカニズム (Database Isolation Mechanism)

## ⚠️ 重要な注意事項

**現在の実装では、設計上のプロセス固有データベース分離は完全には実現されていません。**
実際には、**環境変数オーバーライド**により全テストプロセスが同一のデータベースを共有しています。

## 概要

Spanwrightは**単一のDockerエミュレータ**を使用し、**プロセスベースのデータベース命名機能**を設計していますが、現在の実装では環境変数設定により全テストが同じデータベースを共有する仕組みになっています。

## アーキテクチャ

### 現在の実装: 単一エミュレータ + 共有データベース

```
Docker Container (spanner-emulator)
├── localhost:9010 (Spanner Emulator)
└── Project: test-project / Instance: test-instance
    ├── primary-db      (全テストプロセスで共有)
    └── secondary-db    (全テストプロセスで共有)
```

### 設計意図: 単一エミュレータ + プロセス固有データベース

```
Docker Container (spanner-emulator)
├── localhost:9010 (Spanner Emulator)
└── Project: test-project / Instance: test-instance
    ├── primary-db-12345    (Process ID: 12345) ※未実装
    ├── secondary-db-12345  ※未実装
    ├── primary-db-12346    (Process ID: 12346) ※未実装
    ├── secondary-db-12346  ※未実装
    └── ...
```

## 実装の現状と設計意図

### 1. プロセスベースデータベース命名の設計

**実装場所**: `template/tests/database-isolation.ts:15`

```typescript
export function getDatabaseConfig(): DatabaseConfig {
  const processId = process.pid;
  
  // 環境変数が優先される（現在の動作）
  const primaryDbId = process.env.PRIMARY_DB_ID || `primary-db-${processId}`;
  const secondaryDbId = process.env.SECONDARY_DB_ID || `secondary-db-${processId}`;
  
  return {
    processId,
    primaryDbId,    // 実際: primary-db (環境変数設定時)
    secondaryDbId   // 実際: secondary-db (環境変数設定時)
  };
}
```

**現実の動作**:
- 環境変数 `PRIMARY_DB_ID=primary-db` が設定されている
- プロセス固有の命名は**環境変数未設定時のフォールバック**として機能
- 実際には全プロセスが同じDB名を取得

### 2. 実際のデータベースライフサイクル

#### **Phase 1: Setup (Makefile)**
```bash
# Makefile:90,95 - 固定DB名でのデータベース作成
PRIMARY_DB_ID=primary-db     # 固定値
SECONDARY_DB_ID=secondary-db # 固定値

# wrench による固定DB名でのスキーマ適用
SPANNER_DATABASE_ID=primary-db wrench create
SPANNER_DATABASE_ID=primary-db wrench apply

# seed-injector による固定DB名でのデータ投入
go run cmd/seed-injector/main.go --database-id primary-db
```

#### **Phase 2: Test Execution (Playwright)**
```bash
# 環境変数が設定されてテスト実行
PRIMARY_DB_ID=primary-db npx playwright test

# 全テストプロセスが同じDB名を取得
getDatabaseConfig() → { primaryDbId: "primary-db", secondaryDbId: "secondary-db" }
```

## 現在の共有データベースアプローチ

### Playwright並列実行設定

**実装場所**: `template/playwright.config.ts:15,21`

```typescript
export default defineConfig({
  // 並列実行は有効だが、実際は共有DBを使用
  fullyParallel: true,
  
  // 環境別ワーカー数制御
  workers: process.env.CI ? 2 : 4,
  
  // グローバルセットアップ（エミュレータ確認のみ）
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),
});
```

**実際の並列実行の流れ**:
1. Playwrightが複数ワーカーを起動
2. 各ワーカーが独自の`process.pid`を持つ
3. **しかし**環境変数により全ワーカーが同じDB名を取得
4. 全テストが`primary-db`, `secondary-db`を共有使用

### 共有データベースの利点と制限

**現在の実装の利点**:
- シンプルな設定とデバッグ
- リソース使用量が少ない
- 一貫したテスト環境

**制限事項**:
- 真の並列分離はなし
- テスト間でのデータ競合の可能性
- 一つのテストが失敗すると他に影響する可能性

### データベースライフサイクル管理

**現在の実装**:
```makefile
# 固定のDB名
PRIMARY_DB_ID ?= primary-db
SECONDARY_DB_ID ?= secondary-db
```

**実際の流れ**:
1. **エミュレータ起動**: Docker containerで単一エミュレータを起動
2. **固定DB作成**: `primary-db`, `secondary-db`を作成
3. **スキーマ適用**: wrenchによる固定DBへのスキーマ適用
4. **データ投入**: seed-injectorによる固定DBへのシードデータ
5. **テスト実行**: 全プロセスが同じDBを共有使用
6. **バリデーション**: spalidateで固定DBを検証

## 実装詳細

### グローバルセットアップ

**実装場所**: `template/tests/global-setup.ts:20`

```typescript
async function globalSetup() {
  // エミュレータ接続確認のみ（実際のDB作成・スキーマ適用・シードはMakefileで事前実行済み）
  const emulatorHost = process.env.SPANNER_EMULATOR_HOST || 'localhost:9010';
  
  // 安全性チェック: エミュレータ接続のみ許可
  await validateEmulatorOnly();
}
```

**特徴**:
- エミュレータの起動確認のみ
- 実際のDB作成・スキーマ適用・シードはMakefileで事前実行
- 本番環境への誤接続防止

### テストでの使用例

**実装場所**: `template/scenarios/example-01-basic-setup/tests/simple-test.spec.ts:9-10`

```typescript
import { getDatabaseConfig } from '../../../tests/database-isolation';

test('example test with shared database', async ({ page }) => {
  const { primaryDbId, secondaryDbId } = getDatabaseConfig();
  
  // 実際には全テストが同じデータベースを使用
  // primaryDbId = "primary-db", secondaryDbId = "secondary-db"
  console.log(`Process ${dbConfig.processId}: Using databases ${dbConfig.primaryDbId}, ${dbConfig.secondaryDbId}`);
});
```

### データ投入の実装

**実装場所**: `template/cmd/seed-injector/main.go:21,50`

```go
func main() {
    var databaseID = flag.String("database-id", "", "Database ID to inject seed data")
    // Makefileから渡される固定のDB名（primary-db）を使用
    
    if err := injectSeedData(config.ProjectID, config.InstanceID, *databaseID, *fixtureDir); err != nil {
        log.Fatalf("Seed injection failed: %v", err)
    }
}
```

**特徴**:
- Makefileから固定のDB名が渡される
- プロセス固有の命名は行われない
- testfixtures ライブラリでYAMLデータを投入

## 設計意図 vs 現実のギャップ

### 設計された利点（未実装）
- **完全な並列実行**: プロセス間でのデータ競合なし
- **独立したテスト環境**: 各プロセスが専用DB
- **スケーラブルな並列度**: プロセス数に応じたDB作成

### 現在の実装の利点
- **シンプルな構成**: 複雑なDB管理不要
- **単一Dockerコンテナ**: 最小限のリソース使用
- **一貫したテスト環境**: 全テストが同じデータを参照

### 現在の実装の制限
- **データ競合の可能性**: 複数テストが同じDBを変更
- **テスト間の依存**: 一つのテストが他に影響する可能性
- **真の並列分離なし**: 設計意図と異なる動作

## 改善提案: 真の並列分離の実現

### 1. 動的データベース作成の実装

```typescript
// enhanced-database-isolation.ts
export async function createProcessSpecificDatabase(config: DatabaseConfig) {
  const processId = process.pid;
  const primaryDbId = `primary-db-${processId}`;
  
  // プロセス固有のDBを動的作成
  await createDatabase(config.projectId, config.instanceId, primaryDbId);
  await applySchema(primaryDbId, config.schemaPath);
  await seedDatabase(primaryDbId, config.fixtureDir);
  
  return { primaryDbId, secondaryDbId: `secondary-db-${processId}` };
}
```

### 2. 拡張Makefileターゲット

```makefile
setup-process-db: ## Setup process-specific database
	@PROCESS_DB_ID=$(PRIMARY_DB_ID)-$(PROCESS_ID) $(MAKE) setup-single-db

setup-single-db:
	@wrench create --database-id $(PROCESS_DB_ID)
	@seed-injector --database-id $(PROCESS_DB_ID)
```

### 3. Playwright統合

```typescript
// playwright.config.ts - 真の分離版
export default defineConfig({
  fullyParallel: true,
  globalSetup: './tests/enhanced-global-setup',
  use: {
    // 各ワーカーが独自のDBコンフィグを持つ
    storageState: async ({ }, use, workerInfo) => {
      const dbConfig = await createProcessSpecificDatabase(workerInfo);
      await use({ ...baseState, dbConfig });
    }
  }
});
```

## トラブルシューティング

### 現在の実装でのよくある問題

#### 1. テスト間でのデータ競合
**症状**: 一つのテストが他のテストのデータを変更
**原因**: 全テストが同じDBを共有
**対策**: テスト順序の制御、またはクリーンアップ強化

#### 2. 並列実行でのデータ不整合
**症状**: テスト結果が実行順序に依存
**原因**: 共有DBでの競合状態
**対策**: worker数を1に制限、またはテスト設計の見直し

#### 3. エミュレータ接続エラー
**症状**: `SPANNER_EMULATOR_HOST` エラー
**原因**: エミュレータが起動していない
**解決**: `make start` でエミュレータを起動

### デバッグのヒント

1. **実際のDB名の確認**:
   ```typescript
   const config = getDatabaseConfig();
   console.log('Process:', config.processId, 'DBs:', config.primaryDbId, config.secondaryDbId);
   // 出力例: Process: 12345 DBs: primary-db secondary-db
   ```

2. **環境変数の確認**:
   ```bash
   echo "PRIMARY_DB_ID: $PRIMARY_DB_ID"
   echo "SECONDARY_DB_ID: $SECONDARY_DB_ID"
   ```

3. **実際のDB作成確認**:
   ```bash
   # エミュレータで利用可能なDBを確認
   SPANNER_EMULATOR_HOST=localhost:9010 gcloud spanner databases list --instance=test-instance
   ```

## まとめ

### 現状の理解

Spanwrightは**プロセスIDベースのデータベース分離機能**を設計していますが、**現在の実装では環境変数オーバーライドにより全テストが同じデータベースを共有**しています。

### 実用的な観点

- **現在の実装**: シンプルで安定した共有DB方式
- **設計意図**: 真の並列分離によるスケーラブルなテスト実行
- **実際の選択**: プロジェクトの要件に応じて選択可能

### 推奨事項

1. **小規模プロジェクト**: 現在の共有DB方式で十分
2. **大規模並列テスト**: 真の分離実装を検討
3. **CI/CD環境**: 現在の方式で安定性を優先

この文書により、Spanwrightのデータベース分離メカニズムの**設計意図と実装現実**を正確に理解できるようになります。