#!/bin/bash

# 使用するリージョンを設定（なければデフォルト値を使用）
if [ -z "$YOUR_REGION" ]; then
  export YOUR_REGION=$(aws configure get region || echo "ap-northeast-1")
  echo "Using region: ${YOUR_REGION}"
fi

# CloudWatch Logsグループ作成
aws logs create-log-group --log-group-name /ecs/adstxt-manager-batch --region ${YOUR_REGION}

# タスク定義を登録
aws ecs register-task-definition --cli-input-json file://task-definition.json --region ${YOUR_REGION}