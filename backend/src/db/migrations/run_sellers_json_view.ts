import fs from 'fs';
import path from 'path';
import db from '../../config/database';
import { logger } from '../../utils/logger';

// Try to locate the SQL file
let sqlFilePath = path.join(__dirname, 'sellers_json_view.sql');

// If file doesn't exist (in dist), try src path
if (!fs.existsSync(sqlFilePath)) {
  sqlFilePath = path.join(__dirname, '../../../src/db/migrations/sellers_json_view.sql');
}

export const runSellersJsonViewMigration = async (): Promise<void> => {
  try {
    logger.info('Checking if running in PostgreSQL mode...');
    // Check if we are using PostgreSQL
    const dbProvider = process.env.DB_PROVIDER || 'sqlite';

    if (dbProvider !== 'postgres') {
      logger.info('Not using PostgreSQL, skipping sellers.json view migration');
      return;
    }

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    await db.exec(sql);
    logger.info('Sellers.json view migration executed successfully');
  } catch (error) {
    logger.error('Error executing sellers.json view migration:', error);
    throw error;
  }
};

// If this file is executed directly
if (require.main === module) {
  runSellersJsonViewMigration()
    .then(() => {
      console.log('Sellers.json view migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Sellers.json view migration failed:', err);
      process.exit(1);
    });
}
