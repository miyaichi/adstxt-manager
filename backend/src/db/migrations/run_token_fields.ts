import path from 'path';
import fs from 'fs';
import db from '../../config/database';

/**
 * This script runs the SQL migration to add token fields to the requests table
 */
async function runMigration() {
  try {
    // Get SQL file content
    const sqlPath = path.join(__dirname, 'add_token_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await db.execute(sql);
    
    console.log('✅ Successfully added token fields to requests table');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();