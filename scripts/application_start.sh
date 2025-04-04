#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR/deploy"

echo "Starting application..."

# 作業ディレクトリに移動
cd $APP_DIR

# データベースの初期化とマイグレーションの実行
echo "Initializing database..."
node dist/db/migrations/run.js || echo "Database initialization failed, but continuing..."

# PM2でアプリケーションを起動
echo "Starting application with PM2..."
pm2 start dist/server.js --name "adstxt-manager" --log adstxt-manager.log || {
    echo "Failed to start with PM2, trying direct Node.js start..."
    nohup node dist/server.js > adstxt-manager.log 2>&1 &
}

# PM2の設定を保存
echo "Saving PM2 configuration..."
pm2 save || true

echo "Waiting for application to start..."
sleep 5

# アプリケーションが実行中か確認
if pm2 list | grep -q "adstxt-manager"; then
    echo "Application started successfully with PM2"
elif lsof -i:3001 -t &>/dev/null; then
    echo "Application started successfully with Node.js"
else
    echo "Error: Application failed to start!"
    exit 1
fi

echo "Application started successfully"