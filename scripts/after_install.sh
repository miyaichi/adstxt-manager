#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Setting up application..."

# 作業ディレクトリに移動
cd $DEPLOY_DIR

# デバッグ情報
echo "Current directory: $(pwd)"
echo "Directory listing:"
ls -la

# ディレクトリ権限の設定
chmod -R 755 .

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

# 環境変数ファイルの確認
if [ -f ".env" ]; then
    echo "Found .env file, creating backup..."
    cp .env .env.bak
else
    echo "Warning: .env file not found in deployment!"
    
    # 基本的な.envファイルを作成
    echo "Creating basic .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_PROVIDER=sqlite
SQLITE_PATH=/home/ec2-user/adstxt-manager/data/adstxt-manager.db
EOF
    echo ".env file created."
fi

echo "Contents of .env file (first 5 lines):"
head -n 5 .env

# データベースディレクトリの設定
echo "Setting up data directory..."
mkdir -p $DEPLOY_DIR/data
chmod 755 $DEPLOY_DIR/data

# SQLiteを使用する場合のディレクトリ設定
if grep -q "DB_PROVIDER=sqlite" .env 2>/dev/null; then
    echo "SQLite database configured, path: $(grep SQLITE_PATH .env | cut -d= -f2)"
    # SQLiteディレクトリが存在することを確認
    SQLITE_DIR=$(dirname $(grep SQLITE_PATH .env | cut -d= -f2))
    mkdir -p $SQLITE_DIR
    chmod 755 $SQLITE_DIR
fi

echo "Setup completed successfully"