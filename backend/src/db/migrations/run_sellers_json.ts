import db from '../../config/database';
import fs from 'fs';
import path from 'path';

export const runSellersJsonMigration = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Read SQL file - use relative path that works both in src and dist
      let sqlPath = path.join(__dirname, 'sellers_json_cache.sql');
      
      // If file doesn't exist (in dist), try src path
      if (!fs.existsSync(sqlPath)) {
        sqlPath = path.join(__dirname, '../../../src/db/migrations/sellers_json_cache.sql');
      }
      
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Run migration
      db.exec(sql, (err) => {
        if (err) {
          console.error('Sellers JSON migration failed:', err);
          reject(err);
        } else {
          console.log('Sellers JSON migration completed successfully');
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
