#!/bin/bash
set -e

echo "Preparing for installation..."

# 必要なツールがインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js 18.x..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

# PM2がインストールされているか確認
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    sudo npm install -g pm2
    # PM2を起動時に自動起動するよう設定
    pm2 startup | grep -v PM2 | sh
else
    echo "PM2 is already installed: $(pm2 -v)"
fi

# 古いアプリケーションファイルをクリーンアップ
if [ -d "/home/ec2-user/adstxt-manager" ]; then
    echo "Cleaning up old application files..."
    rm -rf /home/ec2-user/adstxt-manager/deploy
fi

# SQLiteを使用する場合、データディレクトリを作成
mkdir -p /home/ec2-user/adstxt-manager/data
chmod 755 /home/ec2-user/adstxt-manager/data

echo "Preparation completed successfully"