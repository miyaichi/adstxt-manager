#!/bin/sh
set -e

# Set default timezone if not provided
if [ -z "$TZ" ]; then
  export TZ="UTC"
fi

# Check for .env file
if [ -f ".env" ]; then
  echo "Found .env file in current directory"
  # Export all variables from .env file
  export $(grep -v '^#' .env | xargs)
fi

# Display environment info
echo "=== AdsTxt Manager Batch Process ==="
echo "Date: $(date)"
echo "Timezone: $TZ"
echo "Node Version: $(node --version)"
echo "Node Environment: $NODE_ENV"
echo "Database Type: $DATABASE_TYPE"
echo "====================================="

# Check if database config is provided
if [ -z "$DATABASE_TYPE" ]; then
  echo "ERROR: No DATABASE_TYPE set. Please provide it in .env file or as an environment variable."
  exit 1
fi

if [ "$DATABASE_TYPE" = "postgres" ]; then
  if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo "ERROR: Missing PostgreSQL configuration. Please set POSTGRES_HOST, POSTGRES_DB, and POSTGRES_USER."
    exit 1
  fi
  echo "Using PostgreSQL database: $POSTGRES_DB on $POSTGRES_HOST"
else
  echo "Using SQLite database"
fi

# Check for required command
if [ $# -eq 0 ]; then
  echo "No command specified, running all maintenance tasks..."
  exec node /app/index.js run-all
else
  echo "Running command: $@"
  exec node /app/index.js "$@"
fi