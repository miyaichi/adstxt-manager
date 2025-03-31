import fs from 'fs';
import path from 'path';
import db from '../../config/database';
import { logger } from '../../utils/logger';

// Try to locate the SQL file
let sqlFilePath = path.join(__dirname, 'sellers_json_postgres.sql');

// If file doesn't exist (in dist), try src path
if (!fs.existsSync(sqlFilePath)) {
  sqlFilePath = path.join(__dirname, '../../../src/db/migrations/sellers_json_postgres.sql');
}

export const runSellersJsonPostgresMigration = async (): Promise<void> => {
  try {
    logger.info('Checking if running in PostgreSQL mode...');
    // Check if we are using PostgreSQL
    const dbProvider = process.env.DB_PROVIDER || 'sqlite';

    if (dbProvider !== 'postgres') {
      logger.info('Not using PostgreSQL, skipping sellers.json JSONB migration');
      return;
    }

    // Run the migration script to create the new table
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await db.execute(sql);
    logger.info('Sellers.json JSONB table created successfully');

    // Call the function to migrate data from the old format to the new format
    await db.execute('SELECT migrate_sellers_json_data()');
    logger.info('Data migration completed successfully');
  } catch (error) {
    logger.error('Error executing sellers.json PostgreSQL migration:', error);
    throw error;
  }
};

// If this file is executed directly
if (require.main === module) {
  runSellersJsonPostgresMigration()
    .then(() => {
      console.log('Sellers.json PostgreSQL migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Sellers.json PostgreSQL migration failed:', err);
      process.exit(1);
    });
}
