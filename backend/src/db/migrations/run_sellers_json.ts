import fs from 'fs';
import path from 'path';
import db from '../../config/database/index';
import { readMigrationFile } from './pathHelper';

export const runSellersJsonMigration = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're using PostgreSQL
      const dbProvider = process.env.DB_PROVIDER || 'postgres';

      // Use PostgreSQL schema (now the default and only option)
      const sql = readMigrationFile('sellers_json_cache.sql');
      console.log(
        `Running sellers_json migration for ${dbProvider}`
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
