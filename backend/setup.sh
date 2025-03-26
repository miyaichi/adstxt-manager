#!/bin/bash

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your configuration if needed."
else
  echo ".env file already exists."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Initialize database
echo "Initializing database..."
npm run migrate

# Seed database with sample data
echo "Would you like to seed the database with sample data? (y/n)"
read answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
  npm run seed
  echo "Database seeded successfully!"
else
  echo "Skipping database seeding."
fi

# sellers.jsonの事前取得
echo "Setting up sellers.json cache directory..."
mkdir -p data/sellers_json

# 事前にsellers.jsonを取得しておくドメインリスト
domains=(
  "ad-generation.jp"
  "appnexus.com"
  "google.com"
  "indexexchange.com"
  "impact-ad.jp"
  "openx.com"
  "pubmatic.com"
  "rubiconproject.com"
  "smartadserver.com"
)

echo "Would you like to pre-fetch sellers.json files for common domains? (y/n)"
read fetch_answer
if [ "$fetch_answer" = "y" ] || [ "$fetch_answer" = "Y" ]; then
  echo "Pre-fetching sellers.json files..."
  
  # 各ドメインのsellers.jsonを取得
  for domain in "${domains[@]}"; do
    echo "Fetching sellers.json from $domain..."
    
    # 特別なURLを使用するドメイン
    if [ "$domain" = "google.com" ]; then
      url="https://storage.googleapis.com/adx-rtb-dictionaries/sellers.json"
    elif [ "$domain" = "advertising.com" ]; then
      url="https://dragon-advertising.com/sellers.json"
    else
      url="https://$domain/sellers.json"
    fi
    
    # sellers.jsonを取得してファイルに保存
    curl -s --max-time 30 -L "$url" -o "data/sellers_json/$domain.json"
    
    # 取得結果を確認
    if [ -s "data/sellers_json/$domain.json" ]; then
      # 有効なJSONかどうかをチェック
      if jq empty "data/sellers_json/$domain.json" 2>/dev/null; then
        echo "✅ Successfully downloaded sellers.json for $domain"
      else
        echo "⚠️ Downloaded file for $domain is not valid JSON"
        # 無効なJSONファイルを削除
        rm "data/sellers_json/$domain.json"
      fi
    else
      echo "❌ Failed to download sellers.json for $domain"
      # 空ファイルを削除
      rm "data/sellers_json/$domain.json"
    fi
  done
  
  echo "sellers.json download completed"
else
  echo "Skipping sellers.json pre-fetching."
fi

echo "Setup complete! You can now start the backend server with 'npm run dev'"