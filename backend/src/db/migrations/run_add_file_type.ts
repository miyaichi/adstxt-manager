import fs from 'fs';
import path from 'path';
import db from '../../config/database';
import { logger } from '../../utils/logger';

// Try to locate the SQL file
let sqlFilePath = path.join(__dirname, 'add_file_type_to_ads_txt_cache.sql');

// If file doesn't exist (in dist), try src path
if (!fs.existsSync(sqlFilePath)) {
  sqlFilePath = path.join(__dirname, '../../../src/db/migrations/add_file_type_to_ads_txt_cache.sql');
}

export const runAddFileTypeMigration = async (): Promise<void> => {
  try {
    // Read SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    await db.execute(sql);

    // Check if the table has file_type column after migration
    const columnCheckResult = await db.execute<{ name: string }[]>(
      `SELECT name FROM pragma_table_info('ads_txt_cache') WHERE name = 'file_type'`
    );
    
    const columnExists = columnCheckResult && columnCheckResult.length > 0;

    logger.info(
      `AdsTxt cache file_type column migration executed successfully. Column exists: ${columnExists}`
    );
  } catch (error) {
    logger.error('Error executing AdsTxt cache file_type migration:', error);
    throw error;
  }
};

// If this file is executed directly
if (require.main === module) {
  runAddFileTypeMigration()
    .then(() => {
      console.log('AdsTxt cache file_type migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('AdsTxt cache file_type migration failed:', err);
      process.exit(1);
    });
}