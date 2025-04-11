import fs from 'fs';
import path from 'path';
import db from '../../config/database';
import { logger } from '../../utils/logger';

// Try to locate the SQL file
let sqlFilePath = path.join(__dirname, 'alter_ads_txt_cache.sql');

// If file doesn't exist (in dist), try src path
if (!fs.existsSync(sqlFilePath)) {
  sqlFilePath = path.join(__dirname, '../../../src/db/migrations/alter_ads_txt_cache.sql');
}

export const runAlterAdsTxtCacheMigration = async (): Promise<void> => {
  try {
    // Read SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await db.execute(sql);
    
    // Check if the table has data after migration
    const countResult = await db.execute<{ count: string }>('SELECT COUNT(*) FROM ads_txt_cache');
    const countArray = countResult as Array<{ count: string }>;
    const recordCount = countArray[0]?.count || '0';
    
    logger.info(`AdsTxt cache alteration migration executed successfully. Table has ${recordCount} records.`);
  } catch (error) {
    logger.error('Error executing AdsTxt cache alteration migration:', error);
    throw error;
  }
};

// If this file is executed directly
if (require.main === module) {
  runAlterAdsTxtCacheMigration()
    .then(() => {
      console.log('AdsTxt cache alteration migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('AdsTxt cache alteration migration failed:', err);
      process.exit(1);
    });
}
