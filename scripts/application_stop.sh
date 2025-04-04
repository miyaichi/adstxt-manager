#!/bin/bash
set -e

echo "Stopping application..."

# Stop PM2 managed application if running
if command -v pm2 &> /dev/null && pm2 list | grep -q "adstxt-manager"; then
    echo "Stopping PM2 process for adstxt-manager"
    pm2 stop adstxt-manager || true
    pm2 delete adstxt-manager || true
    echo "PM2 process stopped"
else
    echo "No PM2 process found"
fi

# Check for any Node.js process on application port
NODE_PID=$(lsof -i:3001 -t 2>/dev/null || echo "")
if [ -n "$NODE_PID" ]; then
    echo "Stopping Node.js process on port 3001 (PID: $NODE_PID)"
    kill -15 $NODE_PID || true
    
    # Give process time to exit gracefully
    sleep 3
    
    # Force kill if still running
    if kill -0 $NODE_PID 2>/dev/null; then
        echo "Process did not exit gracefully, force killing"
        kill -9 $NODE_PID || true
    fi
    
    echo "Node.js process stopped"
fi

echo "Application stopped successfully"
exit 0