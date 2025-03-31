import db from '../../config/database';
import fs from 'fs';
import path from 'path';

export const runSellersJsonMigration = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'sqlite';

      // Always use the SQLite schema file for now - we'll handle PostgreSQL separately
      let sqlPath = path.join(__dirname, 'sellers_json_cache.sql');
      if (!fs.existsSync(sqlPath)) {
        sqlPath = path.join(__dirname, '../../../src/db/migrations/sellers_json_cache.sql');
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(
        `Running sellers_json migration for ${dbProvider} (using SQLite-compatible schema)`
      );

      // Run migration
      db.exec(sql, (err) => {
        if (err) {
          console.error('Sellers JSON migration failed:', err);
          reject(err);
        } else {
          console.log('Sellers JSON migration completed successfully');

          // If using PostgreSQL, we'll update the schema in a separate process
          if (dbProvider === 'postgres') {
            console.log(
              'Note: For PostgreSQL, run the manual-reset.js script to update to JSONB schema'
            );
          }

          resolve();
        }
      });
    } catch (error) {
      console.error('Error in sellers JSON migration:', error);
      reject(error);
    }
  });
};

// For direct execution from command line
if (require.main === module) {
  runSellersJsonMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
