# AWS Amplify 設定ガイド

このドキュメントは、AWS Amplifyでのデプロイと設定方法を説明します。Amplifyでは、以下の設定が必要です：

1. フロントエンド（React）のビルドと配信
2. バックエンド（Node.js）のビルドと実行
3. データベース（DynamoDB）の設定
4. 環境変数の設定
5. リダイレクト設定

**重要**: 環境変数は Amplify コンソールで設定するため、このファイルはリポジトリに含めても構いません。実際のシークレット値はここに記載せず、Amplify コンソールでのみ設定してください。

## 必須環境変数

```
NODE_ENV=production
PORT=3000
APP_URL=https://YOUR_AMPLIFY_URL

# 安全なランダム文字列を生成して設定（JWT認証用）
# 以下のコマンドで生成できます:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
# 例: 7HeXE5dn3nJBpCLNP15kiYyjwZCG_BsKY4Hc4_gepq0
TOKEN_SECRET=GENERATED_SECURE_TOKEN

# Email設定（AWS SESを推奨）
SMTP_HOST=email-smtp.REGION.amazonaws.com
SMTP_PORT=587
SMTP_USER=YOUR_SES_USER
SMTP_PASS=YOUR_SES_PASSWORD
SMTP_FROM=noreply@YOUR_DOMAIN.com
SMTP_FROM_NAME=Ads.txt Manager
```

## Amplify バックエンド設定手順

1. AWS Amplifyコンソールにログイン
2. アプリを選択
3. 「バックエンド環境」タブで「新しい環境を追加」をクリック
4. 環境名（例：「dev」）を入力して作成

5. データベース（DynamoDB）の設定:
   - ローカルでプロジェクトのルートディレクトリ（`/Users/miyaichi/adstxt-manager`）で以下のコマンドを実行（Amplify CLIをインストール済みの場合）:
   ```
   amplify init
   amplify add api
   ```
   - プロンプトで「GraphQL API」を選択し、リポジトリの `amplify-schema.graphql` を使用
   - 完了したら `amplify push` を実行

6. または、Amplifyコンソールから直接設定:
   - 「バックエンド環境」→「API」→「Create API」
   - GraphQLを選択
   - リポジトリの `amplify-schema.graphql` の内容を貼り付ける
   - APIを作成

7. 「環境変数」タブを選択
8. 「変数の追加」をクリック
9. 上記の環境変数を1つずつ追加
10. 変更を保存
11. アプリを再デプロイ

## リダイレクト/リライト設定

SPAとAPIプロキシのために以下の設定も必要です：

1. 「リワイトとリダイレクト」タブを選択
2. 以下のルールを追加：

- SPAのためのリライト：
  ソース: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
  ターゲット: `/index.html`
  タイプ: `200 (Rewrite)`

- APIプロキシ（フロントエンドとバックエンドの接続）：
  ソース: `/api/<*>`
  ターゲット: `/`
  タイプ: `200 (Rewrite)`