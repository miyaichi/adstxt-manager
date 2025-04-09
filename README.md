# Ads.txt Manager (Ads.txt マネージャー)

Ads.txt Manager は、パブリッシャーと広告サービス・代理店間の Ads.txt 更新プロセスを簡素化するためのウェブアプリケーションです。

## 概要

インターネット広告業界では、パブリッシャーが自社の広告枠を誰に販売するかを明確にするために Ads.txt ファイルを公開しています。広告サービスや代理店がパブリッシャーの広告枠を販売するためには、このファイルに情報を追加してもらう必要があります。

このアプリケーションは、従来のメールによる依頼プロセスをウェブベースのワークフローに置き換え、以下の利点を提供します：

- セキュアな固有URLによるアクセス管理
- Ads.txtデータの自動バリデーション
- パブリッシャーと依頼者間の対話型コミュニケーション
- Ads.txtファイル更新の追跡管理

## 主な機能

- **セキュアなリクエスト管理**: SHA256ハッシュによる固有URLの生成
- **Ads.txtデータの検証**: アップロード時に構文チェックと既存データとの整合性確認
- **自動メール通知**: リクエスト作成や状態変更時の通知
- **対話型インターフェース**: パブリッシャーと依頼者間のメッセージング機能
- **Ads.txt管理**: パブリッシャー側での効率的なレコード追加・管理
- **Ads.txt最適化機能**: 重複除去、フォーマット標準化、Certification ID補完

## 設計原則

- **最小限のユーザー管理**: ユーザーやパブリッシャーの情報をデータベースに登録せず、トークンベースのアクセス管理を実装
- **メールフロー中心の認証**: ユーザー登録なしでメールアドレスを主な識別子として使用し、リクエストごとに一意のリンクを送付
- **リクエスト中心のデータモデル**: ユーザー情報はリクエスト内の属性として管理し、専用のユーザーテーブルは作成しない
- **ステートレスなリクエスト管理**: リクエストの状態と必要最小限のメタデータのみを保存

## 技術スタック

- **フロントエンド**: React, Amplify UI, TypeScript
- **バックエンド**: Node.js, Express, TypeScript
- **データベース**: SQLite, PostgreSQL
- **メール送信**: SMTP
- **自動化**: cron（sellers.json自動更新）
- **開発ツール**: Claude Code (vibe coding)

## セットアップ手順

### 前提条件

- Node.js (v14以上)
- npm または yarn

### インストール

1. リポジトリをクローン：
   ```
   git clone https://github.com/miyaichi/adstxt-manager.git
   cd adstxt-manager
   ```

2. バックエンドのセットアップ：
   ```
   cd backend
   npm install
   cp .env.example .env
   ```
   `.env`ファイルを編集して、SMTPサーバーなどの設定を行ってください。

3. フロントエンドのセットアップ：
   ```
   cd ../frontend
   npm install
   ```

### 開発環境での実行

1. バックエンドサーバーの起動：
   ```
   cd backend
   npm run dev
   ```

2. フロントエンドの起動（別ターミナルで）：
   ```
   cd frontend
   npm start
   ```

3. ブラウザで `http://localhost:3000` にアクセス

## デプロイ

アプリケーションは任意のホスティングサービスにデプロイできます。本リポジトリでは、GitHub ActionsとAWS CodeDeployを使用した自動デプロイパイプラインを実装しています。

### GitHub ActionsとAWS CodeDeployによる自動デプロイ

mainブランチへの変更がプッシュされると、自動デプロイパイプラインが起動し、次の処理が実行されます：

1. **ビルドプロセス**:
   - バックエンドとフロントエンドのビルド
   - 環境変数ファイルの生成
   - 依存関係のインストール

2. **パッケージング**:
   - アプリケーションファイルと依存関係のパッケージング
   - CodeDeployのデプロイスクリプトの追加
   - ZIPファイルの作成

3. **デプロイプロセス**:
   - ZIPファイルをAWS S3バケットにアップロード
   - AWS CodeDeployでEC2インスタンスへのデプロイを開始
   - デプロイ状態の初期確認

#### 必要なAWSリソース

1. **EC2インスタンス**:
   - Amazon Linux 2023推奨
   - CodeDeployエージェントがインストールされていること(UserDataを使用)
   - セキュリティグループの設定（HTTPポート開放）
   - 適切なIAMロールがアタッチされていること（S3読み取り権限含む）

2. **IAMロール設定**:
   - EC2インスタンス用ロール: `AmazonS3ReadOnlyAccess`ポリシーを含むこと
   - CodeDeploy用サービスロール: `AWSCodeDeployRole`ポリシーを含むこと

3. **CodeDeployの設定**:
   - CodeDeployアプリケーションの作成
   - デプロイグループの作成（EC2インスタンスをターゲットに設定）

#### GitHubリポジトリの設定

自動デプロイを有効にするには、GitHubリポジトリのSettingsで以下のSecretsを設定してください：

**AWS認証情報** (Secrets):
- `AWS_ACCESS_KEY_ID`: AWS アクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWS シークレットアクセスキー
- `AWS_REGION`: AWS リージョン（例：ap-northeast-1）
- `S3_BUCKET`: デプロイパッケージをアップロードするS3バケット名

**CodeDeploy設定** (Variables):
- `CODEDEPLOY_APP_NAME`: CodeDeployアプリケーション名
- `CODEDEPLOY_DEPLOYMENT_GROUP`: デプロイグループ名

**データベース設定** (Secrets):
- SQLite使用時:
  - `SQLITE_PATH`: SQLiteファイルのパス

- PostgreSQL使用時 (AWS RDSなど):
  - **推奨設定** (必須):
    - `DB_HOST`: データベースホスト（AWS RDSエンドポイントなど）
    - `DB_PORT`: データベースポート（通常は5432）
    - `DB_NAME`: データベース名
    - `DB_USER`: データベースユーザー名（マスターユーザーまたは専用ユーザー）
    - `DB_PASSWORD`: データベースパスワード
    
    注: これらの個別パラメータから自動的に `DATABASE_URL` が生成されます
  
  - SSL証明書設定（オプション）:
    - `DB_SSL_CA`: CA証明書ファイルパスまたは内容
    - `DB_SSL_CERT`: クライアント証明書ファイルパスまたは内容
    - `DB_SSL_KEY`: クライアント鍵ファイルパスまたは内容

**アプリケーション環境変数** (Variables):
- `REACT_APP_API_URL`: フロントエンドがAPIにアクセスするURL
- `DB_PROVIDER`: データベースプロバイダ（`sqlite`または`postgres`）
- `PORT`: バックエンドサーバーのポート番号（デフォルト: 3001）
- `DB_SSL_REQUIRED`: SSL接続を使用するかどうか（`true`または`false`）
- `DB_SSL_REJECT_UNAUTHORIZED`: 自己署名証明書を許可するかどうか（`true`または`false`）
- `DB_MAX_POOL_SIZE`: 接続プールの最大サイズ
- `DB_IDLE_TIMEOUT`: アイドル接続のタイムアウト（ミリ秒）
- `DB_CONNECTION_TIMEOUT`: 接続タイムアウト（ミリ秒）
- `DB_HEALTH_CHECK_INTERVAL`: ヘルスチェック間隔（ミリ秒）

#### マニュアルデプロイ

CodeDeployを使用せずに手動でデプロイする場合は、以下の手順に従ってください：

1. アプリケーションのビルド:
   ```bash
   # バックエンドのビルド
   cd backend
   npm install
   npm run build

   # フロントエンドのビルド
   cd ../frontend
   npm install
   npm run build
   ```

2. サーバーへのファイル転送:
   ```bash
   # 必要なファイルの準備
   mkdir -p deploy
   cp -r backend/dist deploy/
   cp -r frontend/build deploy/public
   cp backend/package.json deploy/
   cp backend/.env deploy/

   # サーバーへの転送
   scp -r deploy user@your-server:/path/to/app
   ```

3. アプリケーションの起動:
   ```bash
   cd /path/to/app
   npm install --production
   node dist/server.js
   ```

## データベース構造

アプリケーションは以下のテーブルを使用します：

- **requests**: リクエスト情報、メールアドレス、生成されたトークン、パブリッシャー情報
- **messages**: リクエストに関するメッセージ
- **ads_txt_records**: 現在のAds.txtの内容
- **ads_txt_cache**: 外部Ads.txtファイルのキャッシュ
- **sellers_json_cache**: sellers.jsonファイルのキャッシュ

### データベース設定

このアプリケーションは以下のデータベースをサポートしています:

- SQLite (開発/テスト用): DB_PROVIDER=sqlite
- PostgreSQL (本番環境推奨): DB_PROVIDER=postgres

#### PostgreSQL設定例

**一般的なPostgreSQL設定:**
```
DB_PROVIDER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=adstxt_manager
DB_USER=dbadmin
DB_PASSWORD=your_password
DB_MAX_POOL_SIZE=10
```

**AWS RDS / クラウド環境向け設定:**
```
DB_PROVIDER=postgres

# 個別のパラメータを使用（推奨方法）
# これらのパラメータから自動的にDATABASE_URLが生成されます
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=adstxt_manager
DB_USER=dbadmin
DB_PASSWORD=your_password

# SSL/TLS設定 (AWS RDSでは通常必須)
DB_SSL_REQUIRED=true
# 自己署名証明書または開発環境の場合:
DB_SSL_REJECT_UNAUTHORIZED=false

# 接続プール最適化設定
DB_MAX_POOL_SIZE=20
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=15000
DB_HEALTH_CHECK_INTERVAL=60000
```

**カスタムSSL証明書が必要な場合:**
```
# 証明書ファイルへのパス
DB_SSL_CA=/path/to/ca-certificate.pem
DB_SSL_CERT=/path/to/client-certificate.pem
DB_SSL_KEY=/path/to/client-key.pem
```

### GitHub Actionsに設定すべき推奨項目

**Secrets** (機密情報):
```
# AWS認証情報
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-northeast-1
S3_BUCKET=my-deployment-bucket

# Database設定 (AWS RDS)
DB_HOST=mydb.123456789012.ap-northeast-1.rds.amazonaws.com
DB_NAME=adstxt_manager
DB_USER=admin
DB_PASSWORD=your-secure-password

# アプリケーション認証
JWT_SECRET=your-secure-jwt-secret

# メール設定
EMAIL_USER=noreply@example.com
EMAIL_PASSWORD=your-email-password
```

**Variables** (環境設定):
```
# デプロイ設定
CODEDEPLOY_APP_NAME=AdsTxtManager
CODEDEPLOY_DEPLOYMENT_GROUP=Production

# アプリケーション設定
REACT_APP_API_URL=https://api.example.com
DB_PROVIDER=postgres
PORT=3001

# PostgreSQL最適化設定
DB_SSL_REQUIRED=true
DB_SSL_REJECT_UNAUTHORIZED=false  # 自己署名証明書の場合
DB_MAX_POOL_SIZE=20
DB_CONNECTION_TIMEOUT=15000
DB_IDLE_TIMEOUT=60000
DB_HEALTH_CHECK_INTERVAL=60000
```

## 使用例

### 依頼者側：
1. 「新規リクエスト」ページにアクセス
2. Ads.txtレコードをアップロード
3. パブリッシャーのメールアドレスを入力して送信
4. 固有のURLが生成され、パブリッシャーにメール通知

### パブリッシャー側：
1. メールに記載されたURLにアクセス（認証不要）
2. アップロードされたAds.txtデータを確認
3. 必要に応じて依頼者とメッセージをやり取り
4. リクエストを承認または拒否
5. 承認した場合、Ads.txtに新しいレコードが追加

### Ads.txt最適化機能：
1. **最適化ツール**: パブリッシャードメインからads.txtを取得し、自動的に最適化
2. **最適化レベル**:
   - **レベル1 (基本)**: 重複除去、フォーマット標準化、ドメインごとのグループ化
   - **レベル2 (高度)**: レベル1の機能に加え、Certification ID補完とセラータイプによるカテゴリ分け
3. **カテゴリ分け** (レベル2):
   - 標準レコード
   - 機密セラー（sellers.jsonでis_confidential=1のもの）
   - sellers.jsonに未登録のレコード
   - sellers.jsonが提供されていない広告システム
4. **プログレスインジケーター**: 最適化プロセスの各フェーズ（取得、解析、sellers.jsonの取得、最適化）の進捗を表示
5. **キャンセル機能**: 長時間の処理を中断できるキャンセルボタン

## ライセンス

MIT

## 謝辞

このプロジェクトは [Claude Code](https://claude.ai/code) を使用した vibe coding アプローチで開発されています。Claude Codeは、自然言語でのコーディング指示を理解し、コード生成から複雑なバグ修正までを支援するAIツールです。vibe codingにより、開発の効率化と質の向上を実現しています。

## お問い合わせ

プロジェクトに関するご質問やフィードバックは、[Issue](https://github.com/miyaichi/adstxt-manager/issues)からお願いします。