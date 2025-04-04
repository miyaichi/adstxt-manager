#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Starting application..."

# Change to application directory
cd $APP_DIR

# Initialize database
echo "Running database migrations..."

# Determine database type and run appropriate migrations
if grep -q "DB_PROVIDER=postgres" .env 2>/dev/null || grep -q "DATABASE_URL=postgres" .env 2>/dev/null; then
    echo "PostgreSQL detected, running PostgreSQL migrations..."
    
    # Check if we're using AWS RDS
    if grep -q "amazonaws.com" .env 2>/dev/null; then
        echo "AWS RDS detected, using PostgreSQL-specific migrations..."
    fi
    
    # Run PostgreSQL migrations
    node dist/db/migrations/run_ads_txt_cache.js || echo "⚠️ ads_txt_cache migration failed, continuing..."
    node dist/db/migrations/run_alter_ads_txt_cache.js || echo "⚠️ alter_ads_txt_cache migration failed, continuing..."
    node dist/db/migrations/run_sellers_json_postgres.js || echo "⚠️ sellers_json migration failed, continuing..."
else
    echo "SQLite detected, running SQLite migrations..."
    node dist/db/migrations/run.js || echo "⚠️ Database initialization failed, continuing anyway..."
fi

# Start application with PM2
echo "Starting application with PM2..."
pm2 start dist/server.js --name "adstxt-manager" --log adstxt-manager.log || {
    echo "Failed to start with PM2, trying direct Node.js start..."
    nohup node dist/server.js > adstxt-manager.log 2>&1 &
}

# Save PM2 configuration for persistence across reboots
echo "Saving PM2 configuration..."
pm2 save || true

# Verify application is running
echo "Verifying application status..."
sleep 5

if pm2 list | grep -q "adstxt-manager"; then
    echo "✅ Application running successfully with PM2"
elif lsof -i:3001 -t &>/dev/null; then
    echo "✅ Application running successfully with Node.js"
else
    echo "❌ Application failed to start!"
    exit 1
fi

echo "Deployment completed successfully"