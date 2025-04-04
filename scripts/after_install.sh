#!/bin/bash
set -e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Setting up application..."

# Change to application directory
cd $APP_DIR

# Set directory permissions
chmod -R 755 .

# Install dependencies
echo "Installing dependencies..."
npm ci --omit=dev --no-audit

# Handle native modules based on architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    echo "ARM architecture detected, rebuilding SQLite..."
    npm uninstall sqlite3 || true
    npm install sqlite3 --build-from-source
elif [[ "$ARCH" == "x86_64" ]] && ! node -e "require('sqlite3')" 2>/dev/null; then
    echo "Rebuilding SQLite for x86_64..."
    npm uninstall sqlite3 || true
    npm install sqlite3 --build-from-source
fi

# Setup .env file
if [ -f ".env" ]; then
    echo "Found .env file, backing up to .env.bak..."
    cp .env .env.bak
else
    echo "Creating default .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DB_PROVIDER=sqlite
SQLITE_PATH=/home/ec2-user/adstxt-manager/data/adstxt-manager.db
EOF
fi

# Setup database directories
echo "Setting up database directories..."
mkdir -p $DEPLOY_DIR/data
chmod 755 $DEPLOY_DIR/data

# Check if using SQLite
if grep -q "DB_PROVIDER=sqlite" .env 2>/dev/null; then
    SQLITE_PATH=$(grep SQLITE_PATH .env | cut -d= -f2)
    echo "SQLite configured, path: $SQLITE_PATH"
    
    # Ensure SQLite directory exists
    SQLITE_DIR=$(dirname "$SQLITE_PATH")
    mkdir -p "$SQLITE_DIR"
    chmod 755 "$SQLITE_DIR"
fi

echo "Application setup completed"