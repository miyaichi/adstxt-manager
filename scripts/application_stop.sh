#!/bin/bash
set -e

echo "Stopping application..."

# PM2がインストールされていて、アプリケーションが実行中かチェック
if command -v pm2 &> /dev/null && pm2 list | grep -q "adstxt-manager"; then
    echo "Stopping PM2 process for adstxt-manager"
    pm2 stop adstxt-manager || true
    pm2 delete adstxt-manager || true
else
    echo "No PM2 process for adstxt-manager found or PM2 is not installed"
fi

# Node.jsのプロセスがポート3001で実行中かチェック
NODE_PID=$(lsof -i:3001 -t 2>/dev/null || echo "")
if [ -n "$NODE_PID" ]; then
    echo "Killing Node.js process running on port 3001 (PID: $NODE_PID)"
    kill -15 $NODE_PID || true
    # プロセスが終了するのを少し待つ
    sleep 5
    # まだ実行中の場合は強制終了
    if kill -0 $NODE_PID 2>/dev/null; then
        echo "Process still running, forcing kill"
        kill -9 $NODE_PID || true
    fi
fi

echo "Application stopped successfully"
exit 0