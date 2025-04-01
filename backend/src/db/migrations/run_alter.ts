import fs from 'fs';
import path from 'path';
import db from '../../config/database';

// Path to migration script
const migrationPath = path.join(__dirname, 'alter_requests_table.sql');

async function runAlterMigrations() {
  console.log('Running database alterations...');

  try {
    // Read the SQL file
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Run the migrations in a transaction
    try {
      // Start transaction
      await db.execute('BEGIN TRANSACTION');

      // Execute migration SQL
      await db.execute(sql);

      // Commit transaction
      await db.execute('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.execute('ROLLBACK');
      throw error;
    }

    console.log('Schema alterations completed successfully');
  } catch (error) {
    console.error('Error running alterations:', error);
    process.exit(1);
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runAlterMigrations();
}

export default runAlterMigrations;
