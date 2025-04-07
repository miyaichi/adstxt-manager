#!/bin/bash
export YOUR_REGION=<YOUR_REGION>

aws events put-rule \
  --name adstxt-manager-batch-daily \
  --schedule-expression "cron(0 1 * * ? *)" \
  --state ENABLED \
  --description "Run adstxt-manager-batch daily at 1:00 AM UTC" \
  --region ${YOUR_REGION}