#!/bin/bash
set -e

echo "Preparing for installation..."

# Backup existing .env file if it exists
if [ -f /home/ec2-user/adstxt-manager/.env ]; then
  echo "Backing up existing .env file..."
  cp /home/ec2-user/adstxt-manager/.env /home/ec2-user/adstxt-manager/.env.backup
  echo "Removing existing .env file to prevent deployment errors..."
  rm /home/ec2-user/adstxt-manager/.env
fi

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 18.x..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
    # Set PM2 to start on system boot
    pm2 startup | grep -v PM2 | sh
else
    echo "PM2 is already installed: $(pm2 -v)"
fi

# Create data directory
mkdir -p /home/ec2-user/adstxt-manager/data
chmod 755 /home/ec2-user/adstxt-manager/data

echo "Environment preparation completed"