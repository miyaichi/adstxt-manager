import fs from 'fs';
import path from 'path';
import db from '../../config/database';

// Path to seed script
const seedPath = path.join(__dirname, 'seed.sql');

/**
 * Run database seeds
 */
async function seedDatabase() {
  console.log('Seeding database with sample data...');

  try {
    // Read the SQL file
    const sql = fs.readFileSync(seedPath, 'utf8');

    // Run the seeds in a transaction for atomicity
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

    console.log('Seeds completed successfully');
  } catch (error) {
    console.error('Error running seeds:', error);
    process.exit(1);
  }
}

// Run seed when script is executed directly
if (require.main === module) {
  seedDatabase();
}

export default seedDatabase;
