import fs from 'fs';
import path from 'path';
import db from '../../config/database/index';
import { logger } from '../../utils/logger';
import { readMigrationFile } from './pathHelper';

export const runAdsTxtCacheMigration = async (): Promise<void> => {
  try {
    // Read SQL file
    const sql = readMigrationFile('ads_txt_cache.sql');

    // Execute the SQL
    await db.execute(sql);

    // Check if the table has data after migration
    const countResult = await db.execute<{ count: string }>('SELECT COUNT(*) FROM ads_txt_cache');
    const countArray = countResult as Array<{ count: string }>;
    const recordCount = countArray[0]?.count || '0';

    logger.info(`AdsTxt cache migration executed successfully. Table has ${recordCount} records.`);
  } catch (error) {
    logger.error('Error executing AdsTxt cache migration:', error);
    throw error;
  }
};

// If this file is executed directly
if (require.main === module) {
  runAdsTxtCacheMigration()
    .then(() => {
      console.log('AdsTxt cache migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('AdsTxt cache migration failed:', err);
      process.exit(1);
    });
}
