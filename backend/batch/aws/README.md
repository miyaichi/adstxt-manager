# AWS ECS Setup for AdsTxt Manager Batch Process

This directory contains configuration files and helper scripts for setting up the AdsTxt Manager batch process on AWS ECS.

## Files

- **Policy Files**:

  - `trust-policy.json` - IAM trust policy for ECS task execution role
  - `events-trust-policy.json` - IAM trust policy for CloudWatch Events role
  - `events-policy.json` - IAM policy for CloudWatch Events role

- **Task Definition**:

  - `task-definition.json` - ECS task definition for the batch process

- **Helper Scripts**:
  - `create-service.sh` - Creates the ECS service
  - `create-rule.sh` - Creates the CloudWatch Events rule for scheduling
  - `update-targets.sh` - Configures the CloudWatch Events rule target
  - `register-task-definition.sh` - Registers the ECS task definition
  - `test-task.sh` - Manually runs a task for testing

## Setup Order

1. Create IAM roles:

   ```bash
   aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
   aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

   aws iam create-role --role-name ecsEventsRole --assume-role-policy-document file://events-trust-policy.json
   aws iam put-role-policy --role-name ecsEventsRole --policy-name ecsEventsPolicy --policy-document file://events-policy.json
   ```

2. Create ECS cluster:

   ```bash
   aws ecs create-cluster --cluster-name adstxt-manager
   ```

3. Register task definition:

   ```bash
   chmod +x register-task-definition.sh
   ./register-task-definition.sh
   ```

4. Create service:

   ```bash
   chmod +x create-service.sh
   ./create-service.sh
   ```

5. Create CloudWatch Events rule:

   ```bash
   chmod +x create-rule.sh
   ./create-rule.sh
   ```

6. Update CloudWatch Events target:

   ```bash
   chmod +x update-targets.sh
   ./update-targets.sh
   ```

7. Test the setup:
   ```bash
   chmod +x test-task.sh
   ./test-task.sh
   ```

## Customization

Update the environment variables in the scripts if you need to change:

- AWS region
- Account ID
- Subnet ID
- Security group ID
- Schedule time

## Monitoring

Monitor the execution of the batch process in:

- CloudWatch Logs - `/ecs/adstxt-manager-batch`
- ECS Task history
- CloudWatch Events rule history

## Updating Task Resources

The task definition has been updated to allocate more resources for handling larger JSON data:

- CPU: 1024 (1 vCPU)
- Memory: 2048MB (2GB)

These values are optimized for processing large sellers.json files (like Google's ~100MB file).

To apply these changes:

1. Register the updated task definition:

   ```bash
   chmod +x register-task-definition.sh
   ./register-task-definition.sh
   ```

2. Update the service to use the new task definition:

   ```bash
   TASK_DEF=$(aws ecs describe-task-definition --task-definition adstxt-manager-batch --query 'taskDefinition.taskDefinitionArn' --output text)
   aws ecs update-service --cluster adstxt-manager --service adstxt-manager-batch --task-definition $TASK_DEF
   ```

3. Or trigger a new GitHub workflow deployment by pushing changes to the batch directory.

If you need to further adjust resources based on performance monitoring, modify the `cpu` and `memory` values in `task-definition.json`.
