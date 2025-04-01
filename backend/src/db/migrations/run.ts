import fs from 'fs';
import path from 'path';
import db from '../../config/database';

// Path to migration scripts
const migrationPath = path.join(__dirname, 'setup.sql');

async function runMigrations() {
  console.log('Running database migrations...');

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

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations();
}

export default runMigrations;
