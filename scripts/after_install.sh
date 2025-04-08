#!/bin/bash
# Don't exit on error to ensure the script completes
set +e

DEPLOY_DIR="/home/ec2-user/adstxt-manager"
APP_DIR="$DEPLOY_DIR"

echo "Setting up application..."

# Change to application directory
cd $APP_DIR

# Set directory permissions
chmod -R 755 .

# Install dependencies
echo "Installing dependencies..."
# Use nohup to prevent SIGHUP from killing the process
nohup bash -c 'npm ci --omit=dev --no-audit' > npm_install.log 2>&1 || {
  echo "npm ci failed, trying with increased timeout..."
  npm config set fetch-timeout 300000
  nohup bash -c 'npm ci --omit=dev --no-audit' > npm_install_retry.log 2>&1
}

# Check if npm install completed successfully
if [ -f "npm_install.log" ]; then
  echo "npm install log:"
  cat npm_install.log
fi
if [ -f "npm_install_retry.log" ]; then
  echo "npm install retry log:"
  cat npm_install_retry.log
fi

# Handle native modules based on architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    echo "ARM architecture detected, rebuilding SQLite..."
    nohup bash -c 'npm uninstall sqlite3 || true' > sqlite_uninstall.log 2>&1
    nohup bash -c 'npm install sqlite3 --build-from-source' > sqlite_install.log 2>&1
    echo "SQLite rebuild log:"
    cat sqlite_install.log
elif [[ "$ARCH" == "x86_64" ]] && ! node -e "require('sqlite3')" 2>/dev/null; then
    echo "Rebuilding SQLite for x86_64..."
    nohup bash -c 'npm uninstall sqlite3 || true' > sqlite_uninstall.log 2>&1
    nohup bash -c 'npm install sqlite3 --build-from-source' > sqlite_install.log 2>&1
    echo "SQLite rebuild log:"
    cat sqlite_install.log
fi

# Setup .env file
ENV_FILE=".env"
ENV_BACKUP=".env.backup"

if [ -f "$ENV_FILE" ]; then
    echo "Found new .env file from deployment..."
    
    # Check if we have a backup from before_install.sh
    if [ -f "$ENV_BACKUP" ]; then
        echo "Found backup .env file, merging configurations..."
        
        # Temporary file for the merged env
        MERGED_ENV=".env.merged"
        
        # Copy the new .env as a base
        cp "$ENV_FILE" "$MERGED_ENV"
        
        # Extract API keys from the backup if they exist
        if grep -q "API_VALID_KEYS" "$ENV_BACKUP"; then
            echo "Preserving API keys from previous configuration..."
            grep "API_VALID_KEYS" "$ENV_BACKUP" >> "$MERGED_ENV"
        fi
        
        # Extract any custom configuration that might be environment-specific
        if grep -q "SQLITE_PATH" "$ENV_BACKUP" && ! grep -q "SQLITE_PATH" "$ENV_FILE"; then
            echo "Preserving SQLite path from previous configuration..."
            grep "SQLITE_PATH" "$ENV_BACKUP" >> "$MERGED_ENV"
        fi
        
        # Move merged file to .env
        mv "$MERGED_ENV" "$ENV_FILE"
        
        # Keep the backup just in case
        mv "$ENV_BACKUP" ".env.previous"
        echo "Environment files merged successfully"
    else
        echo "No backup .env found, using the deployed version"
    fi
else
    echo "No .env file found in deployment, checking for backup..."
    
    if [ -f "$ENV_BACKUP" ]; then
        echo "Restoring .env from backup..."
        cp "$ENV_BACKUP" "$ENV_FILE"
        mv "$ENV_BACKUP" ".env.previous"
    else
        echo "Creating default .env file..."
        cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=3001
DB_PROVIDER=sqlite
SQLITE_PATH=/home/ec2-user/adstxt-manager/data/adstxt-manager.db
# API Integration Settings
API_INTEGRATION_ENABLED=true
API_VALID_KEYS=test-api-key-1,test-api-key-2
EOF
    fi
fi

# Ensure API integration settings exist
if ! grep -q "API_INTEGRATION_ENABLED" "$ENV_FILE"; then
    echo "Adding missing API integration settings..."
    echo "" >> "$ENV_FILE"
    echo "# API Integration Settings" >> "$ENV_FILE"
    echo "API_INTEGRATION_ENABLED=true" >> "$ENV_FILE"
    echo "API_VALID_KEYS=test-api-key-1,test-api-key-2" >> "$ENV_FILE"
fi

# Display a sanitized version of the final .env for debugging
echo "Final .env configuration (sensitive values hidden):"
grep -v "PASSWORD\|SECRET\|KEY" "$ENV_FILE" || echo "No basic config found!"

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