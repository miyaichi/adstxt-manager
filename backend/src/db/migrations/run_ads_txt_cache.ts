import fs from 'fs';
import path from 'path';
import { db } from '../../config/database';
import { logger } from '../../utils/logger';

const sqlFilePath = path.join(__dirname, 'ads_txt_cache.sql');

export const runAdsTxtCacheMigration = async (): Promise<void> => {
  try {
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await db.exec(sql);
    logger.info('AdsTxt cache migration executed successfully');
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