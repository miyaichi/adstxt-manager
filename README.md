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

## 設計原則

- **最小限のユーザー管理**: ユーザーやパブリッシャーの情報をデータベースに登録せず、トークンベースのアクセス管理を実装
- **メールフロー中心の認証**: ユーザー登録なしでメールアドレスを主な識別子として使用し、リクエストごとに一意のリンクを送付
- **リクエスト中心のデータモデル**: ユーザー情報はリクエスト内の属性として管理し、専用のユーザーテーブルは作成しない
- **ステートレスなリクエスト管理**: リクエストの状態と必要最小限のメタデータのみを保存

## 技術スタック

- **フロントエンド**: React, Amplify UI, TypeScript
- **バックエンド**: Node.js, Express, TypeScript
- **データベース**: SQLite, PostgreSQL
- **メール送信**: SMTP (開発), Amazon SES (本番環境)
- **インフラ**: AWS Elastic Beanstalk, Amazon RDS, Amazon SES
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

アプリケーションは任意のホスティングサービスにデプロイできます。

### AWS Elastic Beanstalkへのデプロイ

このプロジェクトはAWS Elastic Beanstalkを使用して簡単にデプロイすることができます。

#### 前提条件

- AWSアカウント
- AWS CLI
- EB CLI
- Node.js 18以上
- 検証済みのSESメールアドレス

#### デプロイ手順

1. プロジェクトのクローン:

```bash
git clone https://github.com/miyaichi/adstxt-manager.git
cd adstxt-manager
```

2. Elastic Beanstalkアプリケーションの初期化:

```bash
eb init
```

プロンプトで以下を選択:
- リージョンを選択
- アプリケーション名を入力
- Node.jsプラットフォームを選択
- SSH接続の設定

3. Elastic Beanstalk環境の作成:

```bash
eb create production-environment \
  --database \
  --database.engine postgres \
  --database.instance db.t3.medium \
  --database.size 20 \
  --database.username dbadmin \
  --database.password <安全なパスワード> \
  --elb-type application \
  --instance_type t3.micro \
  --service-role aws-elasticbeanstalk-service-role
```

#### aws-elasticbeanstalk-service-roleの作成方法

Elastic Beanstalk用のサービスロールがない場合は、以下の手順で作成できます:

1. AWSコンソールからIAMに移動
2. ロール > 新しいロールの作成
3. 「AWS サービス」を選択し、「Elastic Beanstalk」を選択
4. 「Elastic Beanstalk Managed Service Role」ポリシーをアタッチ
5. ロール名を「aws-elasticbeanstalk-service-role」に設定して作成

または、AWS CLIで以下のコマンドを実行:

```bash
aws iam create-role --role-name aws-elasticbeanstalk-service-role --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"elasticbeanstalk.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name aws-elasticbeanstalk-service-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService
```

4. 環境変数の設定:

```bash
eb setenv \
  EMAIL_ADDRESS=your-verified-email@example.com \
  APPLICATION_URL=your-eb-domain.elasticbeanstalk.com
```

5. デプロイ:

```bash
eb deploy
```

#### カスタマイズ

`.ebextensions`ディレクトリの設定ファイルを編集して以下をカスタマイズできます:

- **データベース設定**: `02_rds.config`ファイルでRDSインスタンスの設定を変更
- **SES設定**: `03_ses.config`ファイルでSESの設定を変更
- **環境変数**: `01_env.config`ファイルで環境変数を変更

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

```
DB_PROVIDER=postgres
PGHOST=your-db-host.rds.amazonaws.com
PGPORT=5432
PGDATABASE=adstxt_manager
PGUSER=dbadmin
PGPASSWORD=your_password
PG_MAX_POOL_SIZE=10
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

## ライセンス

MIT

## 謝辞

このプロジェクトは [Claude Code](https://claude.ai/code) を使用した vibe coding アプローチで開発されています。Claude Codeは、自然言語でのコーディング指示を理解し、コード生成から複雑なバグ修正までを支援するAIツールです。vibe codingにより、開発の効率化と質の向上を実現しています。

## お問い合わせ

プロジェクトに関するご質問やフィードバックは、[Issue](https://github.com/miyaichi/adstxt-manager/issues)からお願いします。
