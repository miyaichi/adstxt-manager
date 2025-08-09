# PostgreSQL テスト環境移行 - 完了

## 実施内容

テスト環境を SQLite から PostgreSQL に移行し、本番環境との一貫性を確保しました。

### 1. 完了した作業

**テスト用PostgreSQL設定**
- `docker-compose.yml` にテスト用PostgreSQLコンテナ追加（ポート5433）
- `testDatabasePostgres.js` によるテスト専用データベースユーティリティ作成
- `testSetup.js` でJest用PostgreSQL設定とセットアップ

**Jest設定の更新**
- `jest.config.js` でPostgreSQL対応設定
- `tsconfig.test.json` でテスト専用TypeScript設定
- 環境変数設定とデータベース初期化処理

**npm スクリプト追加**
```json
{
  "test:postgres": "TEST_PGHOST=localhost TEST_PGPORT=5433 TEST_PGDATABASE=adstxt_test TEST_PGUSER=testuser TEST_PGPASSWORD=testpass jest",
  "test:postgres:docker": "docker-compose up -d postgres-test && npm run test:postgres && docker-compose stop postgres-test"
}
```

### 2. テスト環境構成

**PostgreSQL テストコンテナ**
- イメージ: postgres:14
- ポート: 5433
- データベース: adstxt_test
- ユーザー: testuser
- パスワード: testpass
- ストレージ: tmpfs（高速化）

**テーブル構成**
- requests, messages, ads_txt_records（基本テーブル）
- ads_txt_cache, sellers_json_cache（キャッシュテーブル）
- sellers_json_cache は JSONB 型でインデックス付き

### 3. メリット

1. **本番環境との一貫性**: PostgreSQL固有のJSONB機能をテストで検証可能
2. **高度なクエリのテスト**: `queryJsonBSellerById`等の最適化されたクエリのテスト
3. **現実的なパフォーマンステスト**: 本番環境に近いデータベース処理性能
4. **隔離されたテスト環境**: tmpfsによる高速なテストデータ管理

### 4. 使用方法

```bash
# PostgreSQLテストコンテナ起動とテスト実行
npm run test:postgres:docker

# 手動でテストコンテナ管理
docker compose up -d postgres-test
npm run test:postgres  
docker compose stop postgres-test
```

### 5. 今後の作業

次は SQLite サポートを完全に削除して PostgreSQL 一本化を完了させる段階です。