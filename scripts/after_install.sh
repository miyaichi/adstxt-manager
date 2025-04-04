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

# Check database configuration
if grep -q "DB_PROVIDER=sqlite" .env 2>/dev/null; then
    SQLITE_PATH=$(grep SQLITE_PATH .env | cut -d= -f2)
    echo "SQLite configured, path: $SQLITE_PATH"
    
    # Ensure SQLite directory exists
    SQLITE_DIR=$(dirname "$SQLITE_PATH")
    mkdir -p "$SQLITE_DIR"
    chmod 755 "$SQLITE_DIR"
else
    echo "PostgreSQL configured"
    
    # Check for DATABASE_URL (used for AWS RDS and other cloud databases)
    if grep -q "DATABASE_URL=" .env 2>/dev/null; then
        echo "Using connection string (DATABASE_URL) for database connection"
        
        # Install pg-native for better performance if not present
        if ! npm list pg-native | grep -q pg-native; then
            echo "Installing pg-native for improved PostgreSQL performance..."
            npm install pg-native --no-save || echo "pg-native installation failed, continuing without it..."
        fi
    else
        echo "Using individual connection parameters for PostgreSQL"
    fi
    
    # Check SSL configuration for AWS RDS
    if grep -q "PG_SSL_REQUIRED=true" .env 2>/dev/null; then
        echo "SSL connection enabled for PostgreSQL"
        
        # Check for custom certificate files
        if grep -q "PG_SSL_CA=" .env 2>/dev/null; then
            SSL_CA_PATH=$(grep PG_SSL_CA .env | cut -d= -f2)
            
            # If it's a file path and not the certificate content itself
            if [[ "$SSL_CA_PATH" == /* ]] && [[ ! "$SSL_CA_PATH" == *"BEGIN CERTIFICATE"* ]]; then
                SSL_CA_DIR=$(dirname "$SSL_CA_PATH")
                echo "Ensuring SSL certificate directory exists: $SSL_CA_DIR"
                mkdir -p "$SSL_CA_DIR"
                chmod 700 "$SSL_CA_DIR"
            fi
        fi
    fi
fi

echo "Application setup completed"