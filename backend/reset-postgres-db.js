#!/usr/bin/env node

// Script to reset and rebuild the PostgreSQL database
const { exec } = require('child_process');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Check if we're using PostgreSQL
const dbProvider = process.env.DB_PROVIDER || 'sqlite';
if (dbProvider !== 'postgres') {
  console.log('Not using PostgreSQL. No action needed.');
  process.exit(0);
}

// Database connection info
const dbName = process.env.PGDATABASE || 'adstxt_manager';
const dbUser = process.env.PGUSER || 'postgres';
const dbPassword = process.env.PGPASSWORD || '';
const dbHost = process.env.PGHOST || 'localhost';
const dbPort = process.env.PGPORT || '5432';

// Create a connection to PostgreSQL server (not to a specific database)
const serverPool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: 'postgres', // Connect to default postgres database
  user: dbUser,
  password: dbPassword
});

// Create a connection for our application database
const appPool = new Pool({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword
});

// Execute a shell command with promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

async function resetDatabase() {
  try {
    console.log('===== DATABASE RESET PROCESS =====');
    
    // 1. Drop and recreate database
    console.log(`\n1. Dropping and recreating database ${dbName}...`);
    const client = await serverPool.connect();
    
    try {
      // Terminate all connections to the database
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
      `);
      
      // Drop and recreate database
      await client.query(`DROP DATABASE IF EXISTS ${dbName};`);
      await client.query(`CREATE DATABASE ${dbName};`);
      console.log(`Database ${dbName} has been recreated.`);
    } finally {
      client.release();
    }
    
    // 2. Set up tables using npm start (which runs migrations)
    console.log('\n2. Setting up database schema...');
    
    // Run the app in the background to create tables
    try {
      // Use execCommand to use the init-db.js script
      await execCommand(`cd ${__dirname} && node init-db.js`);
      console.log('Database schema created successfully.');
    } catch (error) {
      console.error('Error setting up database schema:', error);
      process.exit(1);
    }

    // 3. Run fetch-sellers-json script to populate data
    console.log('\n3. Fetching sellers.json data...');
    try {
      // Use a small set for testing
      await execCommand(`cd ${__dirname} && node fetch-sellers-json.js google.com`);
      console.log('Sellers.json data fetched successfully.');
    } catch (error) {
      console.error('Error fetching sellers.json data:', error);
    }

    console.log('\n===== DATABASE RESET COMPLETE =====');
    console.log('The PostgreSQL database has been reset and initialized with fresh data.');
    console.log('You can now start the application with npm start');
    
  } catch (error) {
    console.error('Error during database reset:', error);
  } finally {
    await serverPool.end();
    await appPool.end();
  }
}

// Create init-db.js script that will be used to initialize the database
fs.writeFileSync(
  path.join(__dirname, 'init-db.js'),
  `
#!/usr/bin/env node
// This script initializes the database schema
require('dotenv').config();
const { initializeDatabase } = require('./src/config/database/index');

async function init() {
  try {
    console.log('Initializing database schema...');
    await initializeDatabase();
    console.log('Database schema initialized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

init();
`
);

// Make the script executable
fs.chmodSync(path.join(__dirname, 'init-db.js'), '755');

// Run the reset process
resetDatabase();