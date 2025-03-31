import fs from 'fs';
import path from 'path';
import db from '../../config/database/index';

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
      db.execute(sql)
        .then(() => {
          console.log('Sellers JSON migration completed successfully');

          resolve();
        })
        .catch((err) => {
          console.error('Sellers JSON migration failed:', err);
          reject(err);
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
