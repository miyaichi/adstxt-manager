#!/bin/bash

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update the .env file with your configuration if needed."
else
  echo ".env file already exists."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Initialize database
echo "Initializing database..."
npm run migrate

# Seed database with sample data
echo "Would you like to seed the database with sample data? (y/n)"
read answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
  npm run seed
  echo "Database seeded successfully!"
else
  echo "Skipping database seeding."
fi

# Prefetch sellers.json files
echo "Would you like to pre-fetch sellers.json files for common domains? (y/n)"
read fetch_answer
if [ "$fetch_answer" = "y" ] || [ "$fetch_answer" = "Y" ]; then
  npm run fetch-sellers-json
else
  echo "Skipping sellers.json pre-fetching."
fi

echo "Setup complete! You can now start the backend server with 'npm run dev'"