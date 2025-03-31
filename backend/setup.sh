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

# Choose database type
echo "Which database would you like to use?"
echo "1) SQLite (default, simple file-based database)"
echo "2) PostgreSQL (more scalable, requires PostgreSQL server)"
read -p "Enter choice [1-2]: " db_choice

if [ "$db_choice" = "2" ]; then
  # Configure for PostgreSQL
  echo "Setting up PostgreSQL database..."
  
  # Get PostgreSQL credentials
  read -p "PostgreSQL host [localhost]: " pg_host
  pg_host=${pg_host:-localhost}
  
  read -p "PostgreSQL port [5432]: " pg_port
  pg_port=${pg_port:-5432}
  
  read -p "PostgreSQL database name [adstxt_manager]: " pg_database
  pg_database=${pg_database:-adstxt_manager}
  
  read -p "PostgreSQL username: " pg_user
  
  read -p "PostgreSQL password (leave empty for no password): " pg_password
  
  # Update .env file
  sed -i '' "s/DB_PROVIDER=sqlite/DB_PROVIDER=postgres/" .env
  sed -i '' "s/PGHOST=localhost/PGHOST=$pg_host/" .env
  sed -i '' "s/PGPORT=5432/PGPORT=$pg_port/" .env
  sed -i '' "s/PGDATABASE=adstxt_manager/PGDATABASE=$pg_database/" .env
  sed -i '' "s/PGUSER=postgres/PGUSER=$pg_user/" .env
  sed -i '' "s/PGPASSWORD=/PGPASSWORD=$pg_password/" .env
  
  echo "Would you like to create the PostgreSQL database if it doesn't exist? (y/n)"
  read create_db
  if [ "$create_db" = "y" ] || [ "$create_db" = "Y" ]; then
    # Try to create database
    if [ -z "$pg_password" ]; then
      PGPASSWORD="" psql -h $pg_host -p $pg_port -U $pg_user -c "CREATE DATABASE $pg_database" postgres 2>/dev/null || echo "Database may already exist or couldn't be created. Continuing..."
    else
      PGPASSWORD="$pg_password" psql -h $pg_host -p $pg_port -U $pg_user -c "CREATE DATABASE $pg_database" postgres 2>/dev/null || echo "Database may already exist or couldn't be created. Continuing..."
    fi
  fi

  # Initialize PostgreSQL schema
  echo "Initializing PostgreSQL tables..."
  npm run migrate:pg
  
  # Check for JSONB format tables
  echo "Would you like to use the improved JSONB format for sellers.json? (recommended) (y/n)"
  read use_jsonb
  if [ "$use_jsonb" = "y" ] || [ "$use_jsonb" = "Y" ]; then
    echo "Updating sellers_json_cache table to use JSONB..."
    node update-postgres-schema.js
  fi
  
  # Ask about data migration if SQLite DB exists
  if [ -f "db/database.sqlite" ]; then
    echo "Found existing SQLite database. Would you like to migrate data to PostgreSQL? (y/n)"
    read migrate_data
    if [ "$migrate_data" = "y" ] || [ "$migrate_data" = "Y" ]; then
      npm run migrate:pg:force
    fi
  fi
else
  # SQLite configuration (default)
  echo "Using SQLite database..."
  sed -i '' "s/DB_PROVIDER=postgres/DB_PROVIDER=sqlite/" .env 2>/dev/null || true
  
  # Initialize database
  echo "Initializing SQLite database..."
  npm run migrate
fi

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