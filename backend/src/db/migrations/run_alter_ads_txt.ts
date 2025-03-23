import fs from 'fs';
import path from 'path';
import db from '../../config/database';

// Path to migration script
const migrationPath = path.join(__dirname, 'alter_ads_txt_records_table.sql');

async function runAlterMigrations() {
  console.log('Running ads_txt_records table alterations...');
  
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

    console.log('ads_txt_records table alterations completed successfully');
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