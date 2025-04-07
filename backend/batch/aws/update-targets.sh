#!/bin/bash
export YOUR_REGION=<YOUR_REGION
export YOUR_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
export YOUR_SUBNET_ID=<YOUR_SUBNET_ID>
export YOUR_SECURITY_GROUP_ID=<YOUR_SECURITY_GROUP_ID>
  
aws events put-targets \
  --rule adstxt-manager-batch-daily \
  --targets "Id=adstxt-manager-batch-task,Arn=arn:aws:ecs:${YOUR_REGION}:${YOUR_ACCOUNT_ID}:cluster/adstxt-manager,RoleArn=arn:aws:iam::${YOUR_ACCOUNT_ID}:role/ecsEventsRole,EcsParameters={TaskDefinitionArn=arn:aws:ecs:${YOUR_REGION}:${YOUR_ACCOUNT_ID}:task-definition/adstxt-manager-batch,TaskCount=1,LaunchType=FARGATE,NetworkConfiguration={awsvpcConfiguration={Subnets=[${YOUR_SUBNET_ID}],SecurityGroups=[${YOUR_SECURITY_GROUP_ID}],AssignPublicIp=ENABLED}}}" \
  --region ${YOUR_REGION}