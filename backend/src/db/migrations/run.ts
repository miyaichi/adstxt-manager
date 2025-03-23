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

    // Run the migrations in a transaction for atomicity
    await new Promise<void>((resolve, reject) => {
      db.exec('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);

        db.exec(sql, (err) => {
          if (err) {
            db.exec('ROLLBACK', () => reject(err));
          } else {
            db.exec('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        });
      });
    });

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
