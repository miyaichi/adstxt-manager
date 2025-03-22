#!/bin/bash

# Setup script for Ads.txt Manager frontend

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js (v14 or later) before proceeding."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
  echo "Error: Node.js version 14 or later is required. Current version: $(node -v)"
  exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  echo "REACT_APP_API_BASE_URL=http://localhost:4000" > .env
  echo "REACT_APP_VERSION=0.1.0" >> .env
fi

# Success message
echo "Setup complete! You can now start the development server with 'npm start'"
echo "Make sure the backend server is running on port 4000 (or update the proxy in package.json)"

# Offer to start development server
read -p "Would you like to start the development server now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm start
fi