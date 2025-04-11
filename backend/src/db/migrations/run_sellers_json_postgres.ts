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

    // Run the migration script to create or upgrade the table
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await db.execute(sql);
    logger.info('Sellers.json JSONB table created or updated successfully');
    
    // Check if the table has data
    const countResult = await db.execute<{ count: string }>('SELECT COUNT(*) FROM sellers_json_cache');
    // Handle array result from db.execute
    const countArray = countResult as Array<{ count: string }>;
    const recordCount = countArray[0]?.count || '0';
    
    logger.info(`Sellers.json cache table has ${recordCount} records`);
    
    // Only try to migrate data if the function exists and we need to
    try {
      const functionExists = await db.execute<{ count: string }>(
        "SELECT COUNT(*) FROM pg_proc WHERE proname = 'migrate_sellers_json_data'"
      );
      
      // Handle array result from db.execute
      const functionExistsArray = functionExists as Array<{ count: string }>;
      const functionCount = functionExistsArray[0]?.count || '0';
      
      if (parseInt(functionCount, 10) > 0) {
        logger.info('Found data migration function, running migration');
        await db.execute('SELECT migrate_sellers_json_data()');
        logger.info('Data migration completed successfully');
      } else {
        logger.info('No data migration function found, skipping migration step');
      }
    } catch (err) {
      logger.warn('Data migration step failed, but table structure is updated', err);
      // Don't fail the whole migration if just the data migration fails
    }
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
