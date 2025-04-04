#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Setting up application..."

# 作業ディレクトリに移動
cd $DEPLOY_DIR

# ZIPファイルが存在するか確認
if [ ! -f "adstxt-manager.zip" ]; then
    echo "Error: adstxt-manager.zip not found!"
    exit 1
fi

# ZIPファイルを解凍
echo "Extracting application files..."
unzip -o adstxt-manager.zip
chmod -R 755 deploy

# 依存関係のクリーンインストール
echo "Installing dependencies..."
cd $APP_DIR
npm ci --omit=dev --no-audit

# ネイティブモジュールの修正 (SQLite3など)
if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
    echo "ARM architecture detected, rebuilding native modules..."
    npm uninstall sqlite3 || true
    npm install sqlite3 --build-from-source
elif [ "$(uname -m)" = "x86_64" ]; then
    echo "x86_64 architecture detected, checking native modules..."
    # x86_64環境では必要に応じてモジュールを再ビルド
    if ! node -e "require('sqlite3')" 2>/dev/null; then
        echo "Rebuilding sqlite3 module..."
        npm uninstall sqlite3 || true
        npm install sqlite3 --build-from-source
    fi
fi

# 環境変数ファイルがすでに存在する場合はバックアップ
if [ -f ".env" ]; then
    echo "Backing up existing .env file..."
    cp .env .env.bak
fi

# データベースディレクトリへのシンボリックリンク作成（SQLite使用時）
if grep -q "DB_PROVIDER=sqlite" .env 2>/dev/null; then
    echo "Setting up SQLite database directory..."
    mkdir -p $DEPLOY_DIR/data
    chmod 755 $DEPLOY_DIR/data
fi

echo "Setup completed successfully"