# AdsTxt Manager Batch Process

This directory contains batch processing scripts for the AdsTxt Manager application. These scripts are designed to run as scheduled tasks to maintain the system by refreshing cache entries and cleaning up old data.

## Features

- **Ads.txt Cache Refresh**: Refreshes expired ads.txt cache entries to ensure data is current
- **Sellers.json Cache Refresh**: Updates expired sellers.json cache entries
- **Sellers.json Prefetch**: Proactively caches sellers.json data based on frequently used domains in ads.txt records
- **Data Cleanup**: Removes old request and message data beyond the retention period
- **Containerized**: Runs as a Docker container for easy deployment
- **Scheduled Execution**: Configured to run daily via AWS ECS Scheduled Tasks

## Local Development

### Prerequisites

- Node.js 16+
- NPM or Yarn
- Access to the AdsTxt Manager database

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create or update the `.env` file in the parent directory with appropriate database settings.

### Running Locally

```bash
# Run all maintenance tasks
node index.js run-all

# Run specific tasks
node index.js refresh-ads-txt
node index.js refresh-sellers-json
node index.js prefetch-sellers-json
node index.js cleanup-data

# Run with options
node index.js refresh-ads-txt --limit 50 --age 14
node index.js prefetch-sellers-json --limit 100 --min-usage 3 --priority-age 5
node index.js cleanup-data --age 120 --dry-run
```

## Docker Usage

### Building the Docker Image

```bash
docker build -t adstxt-manager-batch .
```

### Running the Docker Container

```bash
# Run all maintenance tasks
docker run -v /path/to/logs:/app/logs \
  adstxt-manager-batch

# Run specific tasks
docker run -v /path/to/logs:/app/logs \
  adstxt-manager-batch refresh-ads-txt --limit 100

# Run with prefetch options
docker run -v /path/to/logs:/app/logs \
  adstxt-manager-batch run-all --prefetch-limit 200 --min-usage 2

# If you need to override environment variables
docker run -v /path/to/logs:/app/logs \
  -e DATABASE_TYPE=postgres \
  -e POSTGRES_HOST=localhost \
  -e POSTGRES_DB=adstxt \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  adstxt-manager-batch refresh-ads-txt --limit 100
```

Note: The Docker image includes the `.env` file during the build process, so you don't need to provide it at runtime unless you want to override specific values.

## AWS Deployment

The batch process is configured to run on AWS ECS as a scheduled Fargate task. The deployment is handled via GitHub Actions workflow.

### Requirements

- AWS ECR repository for the Docker image
- AWS ECS cluster, task definition, and service
- CloudWatch Events rule for scheduling
- IAM role with appropriate permissions
- Network configuration with VPC, subnet, and security group

### AWS Configuration Files

For AWS setup, configuration files and helper scripts are available in the `aws/` directory:

```bash
# Make scripts executable
chmod +x aws/*.sh

# Follow setup instructions in
cat aws/README.md
```

### Environment Variables

The following environment variables must be configured in the ECS task:

- `DATABASE_TYPE`: Type of database ('sqlite' or 'postgres')
- `TZ`: Timezone (defaults to 'UTC')
- For PostgreSQL:
  - `POSTGRES_HOST`: Database host
  - `POSTGRES_PORT`: Database port
  - `POSTGRES_DB`: Database name
  - `POSTGRES_USER`: Database user
  - `POSTGRES_PASSWORD`: Database password

## Architecture

- **index.js**: Main entry point and CLI interface
- **utils/**: Utility modules for database and logging
- **tasks/**: Individual task implementations

## Logging

Logs are written to:

- Console (stdout/stderr)
- /app/logs/batch.log (all logs)
- /app/logs/batch-error.log (error logs only)

Logs include detailed information about task execution, errors, and statistics.

## Maintenance

If you need to modify the scheduled execution:

1. Update the CloudWatch Events rule in AWS console or via AWS CLI
2. The recommended schedule is once per day during off-peak hours
