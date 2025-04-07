#!/bin/bash
export YOUR_REGION=<YOUR_REGION>

# CloudWatch Logsグループ作成
aws logs create-log-group --log-group-name /ecs/adstxt-manager-batch --region ${YOUR_REGION}

# タスク定義を登録
aws ecs register-task-definition --cli-input-json file://task-definition.json --region ${YOUR_REGION}