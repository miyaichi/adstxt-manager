#!/bin/bash
# このスクリプトはAmplify関連の未使用ファイルを削除します

# 古いAmplifyファイルを検索して削除
echo "Removing old Amplify files..."
find ./src -name "amplify*.ts" -not -path "**/unused/**" -exec rm -f {} \;

# amplify-models ディレクトリが存在する場合は削除
if [ -d "./src/models/amplify-models" ]; then
  echo "Removing amplify-models directory..."
  rm -rf ./src/models/amplify-models
fi

echo "Clean-up completed."