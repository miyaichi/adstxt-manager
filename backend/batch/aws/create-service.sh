#!/bin/bash
export YOUR_REGION=<YOUR_REGION>
export YOUR_SUBNET_ID=<YOUR_SUBNET_ID
export YOUR_SECURITY_GROUP_ID=<YOUR_SECURITY_GROUP_ID>

aws ecs create-service \
    --cluster adstxt-manager \
    --service-name adstxt-manager-batch \
    --task-definition adstxt-manager-batch \
    --desired-count 0 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${YOUR_SUBNET_ID}],securityGroups=[${YOUR_SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
    --region ${YOUR_REGION}