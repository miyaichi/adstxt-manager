# Ads.txt Manager (Ads.txt マネージャー)

Ads.txt Manager は、パブリッシャーと広告サービス・代理店間の Ads.txt 更新プロセスを簡素化するためのウェブアプリケーションです。

## 概要

インターネット広告業界では、パブリッシャーが自社の広告枠を誰に販売するかを明確にするために Ads.txt ファイル（CSV形式）を公開しています。広告サービスや代理店がパブリッシャーの広告枠を販売するためには、このファイルに情報を追加してもらう必要があります。

このアプリケーションは、従来のメールによる依頼プロセスをウェブベースのワークフローに置き換え、以下の利点を提供します：

- セキュアな固有URLによるアクセス管理
- CSVデータの自動バリデーション
- パブリッシャーと依頼者間の対話型コミュニケーション
- Ads.txtファイル更新の追跡管理

## 主な機能

- **セキュアなリクエスト管理**: SHA256ハッシュによる固有URLの生成
- **CSVデータの検証**: アップロード時に構文チェックと既存データとの整合性確認
- **自動メール通知**: リクエスト作成や状態変更時の通知
- **対話型インターフェース**: パブリッシャーと依頼者間のメッセージング機能
- **Ads.txt管理**: パブリッシャー側での効率的なレコード追加・管理

## 技術スタック

- **フロントエンド**: React, Material-UI
- **バックエンド**: Node.js, Express
- **データベース**: SQLite
- **デプロイ**: AWS Amplify

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

## デプロイ手順（AWS Amplify）

1. AWS Amplifyコンソールにログイン

2. 「ウェブアプリのホスティング」→「開始する」

3. GitHubなどのリポジトリサービスと連携

4. ビルド設定：
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend/build
       files:
         - '**/*'
   backend:
     phases:
       preBuild:
         commands:
           - cd backend
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: backend
       files:
         - '**/*'
   ```

5. 環境変数の設定：
   - `APP_URL`: デプロイ後のURL
   - `SMTP_HOST`: SMTPサーバーホスト
   - その他必要な環境変数

## データベース構造

アプリケーションは以下のテーブルを使用します：

- **users**: ユーザー情報（パブリッシャーと依頼者）
- **requests**: Ads.txt更新リクエスト
- **messages**: リクエストに関するメッセージ
- **ads_txt_records**: 現在のAds.txtの内容

## 使用例

### 依頼者側：
1. 「新規リクエスト」ページにアクセス
2. CSVファイルをアップロード
3. パブリッシャーを選択して送信
4. 固有のURLが生成され、パブリッシャーにメール通知

### パブリッシャー側：
1. メールに記載されたURLにアクセス
2. アップロードされたCSVデータを確認
3. 必要に応じて依頼者とメッセージをやり取り
4. リクエストを承認または拒否
5. 承認した場合、Ads.txtに新しいレコードが追加

## ライセンス

MIT

## お問い合わせ

プロジェクトに関するご質問やフィードバックは、[Issue](https://github.com/miyaichi/adstxt-manager/issues)からお願いします。
