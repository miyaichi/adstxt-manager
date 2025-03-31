
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
