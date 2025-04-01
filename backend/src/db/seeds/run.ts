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

    // Run the seeds in a transaction
    try {
      // Start transaction
      await db.execute('BEGIN TRANSACTION');

      // Execute seed SQL
      await db.execute(sql);

      // Commit transaction
      await db.execute('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.execute('ROLLBACK');
      throw error;
    }

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
