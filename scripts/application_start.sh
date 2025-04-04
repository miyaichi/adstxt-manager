#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Starting application..."

# Change to application directory
cd $APP_DIR

# Initialize database
echo "Running database migrations..."
node dist/db/migrations/run.js || echo "⚠️ Database initialization failed, continuing anyway..."

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